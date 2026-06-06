-- =============================================================================
-- VendorBridge: Procurement & Vendor Management ERP
-- PostgreSQL Database Schema
-- =============================================================================
-- Normalization  : 3NF applied throughout
-- Integrity      : FK constraints, CHECK constraints, NOT NULL, UNIQUE
-- Automation     : Triggers, Functions, Procedures
-- ID Strategy    : BIGSERIAL everywhere — sequential integers for max speed
-- Audit          : activity_logs table + trigger on key mutations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email/text

-- ---------------------------------------------------------------------------
-- ENUMS  (single source of truth for status values)
-- ---------------------------------------------------------------------------

CREATE TYPE user_role        AS ENUM ('admin', 'procurement_officer', 'manager', 'vendor');
CREATE TYPE user_status      AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE vendor_status    AS ENUM ('pending', 'approved', 'blacklisted');
CREATE TYPE rfq_status       AS ENUM ('draft', 'published', 'closed', 'cancelled');
CREATE TYPE quotation_status AS ENUM ('submitted', 'under_review', 'accepted', 'rejected');
CREATE TYPE approval_status  AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE po_status        AS ENUM ('draft', 'confirmed', 'delivered', 'cancelled');
CREATE TYPE invoice_status   AS ENUM ('generated', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE activity_entity  AS ENUM (
    'user', 'vendor', 'rfq', 'quotation', 'approval', 'purchase_order', 'invoice'
);

-- ---------------------------------------------------------------------------
-- SCHEMA: lookup / master data
-- ---------------------------------------------------------------------------

-- 1. Countries (ISO master — avoids repeating country strings)
CREATE TABLE countries (
    id            SMALLSERIAL  PRIMARY KEY,
    code          CHAR(2)      NOT NULL UNIQUE,   -- ISO 3166-1 alpha-2
    name          VARCHAR(100) NOT NULL UNIQUE
);

-- 2. States / Provinces
CREATE TABLE states (
    id            SERIAL       PRIMARY KEY,
    country_id    SMALLINT     NOT NULL REFERENCES countries(id),
    code          VARCHAR(10)  NOT NULL,
    name          VARCHAR(100) NOT NULL,
    UNIQUE (country_id, code)
);

-- 3. Vendor Categories (normalised; vendors can belong to multiple)
CREATE TABLE vendor_categories (
    id            SERIAL       PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. Product / Service Categories (self-referencing hierarchy)
CREATE TABLE product_categories (
    id            SERIAL       PRIMARY KEY,
    parent_id     INT          REFERENCES product_categories(id) ON DELETE SET NULL,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (parent_id, name)
);

-- 5. Units of Measure
CREATE TABLE units_of_measure (
    id            SERIAL       PRIMARY KEY,
    abbreviation  VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. pcs, kg, ltr, hr
    description   VARCHAR(100)
);

-- 6. Tax Rates (reusable across PO / Invoice lines)
CREATE TABLE tax_rates (
    id            SERIAL         PRIMARY KEY,
    name          VARCHAR(50)    NOT NULL UNIQUE,  -- e.g. GST 18%, IGST 5%
    rate          NUMERIC(5,2)   NOT NULL CHECK (rate >= 0 AND rate <= 100),
    is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- SCHEMA: users & authentication
-- ---------------------------------------------------------------------------

-- 7. Users
CREATE TABLE users (
    id              BIGSERIAL     PRIMARY KEY,
    email           CITEXT        NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,
    full_name       VARCHAR(150)  NOT NULL,
    phone           VARCHAR(20),
    role            user_role     NOT NULL DEFAULT 'procurement_officer',
    status          user_status   NOT NULL DEFAULT 'active',
    avatar_url      TEXT,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 8. Password Reset Tokens (separate table — no stale data in users row)
CREATE TABLE password_reset_tokens (
    id            BIGSERIAL   PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    TEXT        NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ NOT NULL,
    used_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. User Sessions / Refresh Tokens
CREATE TABLE user_sessions (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   TEXT        NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- SCHEMA: vendor management
-- ---------------------------------------------------------------------------

-- 10. Vendors (core record)
CREATE TABLE vendors (
    id                BIGSERIAL     PRIMARY KEY,
    user_id           BIGINT        REFERENCES users(id) ON DELETE SET NULL,  -- optional portal login
    company_name      VARCHAR(200)  NOT NULL,
    trade_name        VARCHAR(200),
    gst_number        VARCHAR(20)   UNIQUE,
    pan_number        VARCHAR(20)   UNIQUE,
    email             CITEXT        NOT NULL UNIQUE,
    phone             VARCHAR(20)   NOT NULL,
    alternate_phone   VARCHAR(20),
    website           TEXT,
    status            vendor_status NOT NULL DEFAULT 'pending',
    rating            NUMERIC(3,2)  CHECK (rating BETWEEN 1.00 AND 5.00),
    notes             TEXT,
    created_by        BIGINT        REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 11. Vendor ↔ Category (M:M bridge)
CREATE TABLE vendor_category_map (
    vendor_id     BIGINT  NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id   INT     NOT NULL REFERENCES vendor_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (vendor_id, category_id)
);

-- 12. Vendor Addresses (one vendor may have HQ + branch addresses)
CREATE TABLE vendor_addresses (
    id            SERIAL       PRIMARY KEY,
    vendor_id     BIGINT       NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    address_type  VARCHAR(50)  NOT NULL DEFAULT 'primary',  -- primary / billing / shipping
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city          VARCHAR(100) NOT NULL,
    state_id      INT          REFERENCES states(id),
    pincode       VARCHAR(20)  NOT NULL,
    country_id    SMALLINT     NOT NULL REFERENCES countries(id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 13. Vendor Bank Details (sensitive; kept separate from vendor master)
CREATE TABLE vendor_bank_details (
    id                  SERIAL       PRIMARY KEY,
    vendor_id           BIGINT       NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(200) NOT NULL,
    account_number      VARCHAR(50)  NOT NULL,
    bank_name           VARCHAR(150) NOT NULL,
    branch_name         VARCHAR(150),
    ifsc_code           VARCHAR(20),
    swift_code          VARCHAR(20),
    is_primary          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Only one primary bank account per vendor
CREATE UNIQUE INDEX IF NOT EXISTS uix_vendor_primary_bank
    ON vendor_bank_details (vendor_id)
    WHERE is_primary = TRUE;

-- ---------------------------------------------------------------------------
-- SCHEMA: RFQ (Request for Quotation)
-- ---------------------------------------------------------------------------

-- 14. RFQs
CREATE TABLE rfqs (
    id                  BIGSERIAL    PRIMARY KEY,
    rfq_number          VARCHAR(30)  NOT NULL UNIQUE,   -- auto-generated e.g. RFQ-2024-00001
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              rfq_status   NOT NULL DEFAULT 'draft',
    submission_deadline TIMESTAMPTZ  NOT NULL,
    delivery_deadline   TIMESTAMPTZ,
    created_by          BIGINT       NOT NULL REFERENCES users(id),
    closed_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (delivery_deadline IS NULL OR delivery_deadline > submission_deadline)
);

-- 15. RFQ Line Items
CREATE TABLE rfq_items (
    id                   BIGSERIAL      PRIMARY KEY,
    rfq_id               BIGINT         NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    product_category_id  INT            REFERENCES product_categories(id),
    item_name            VARCHAR(255)   NOT NULL,
    description          TEXT,
    quantity             NUMERIC(12,3)  NOT NULL CHECK (quantity > 0),
    unit_id              INT            NOT NULL REFERENCES units_of_measure(id),
    estimated_unit_price NUMERIC(15,2),
    specifications       TEXT,
    sort_order           SMALLINT       NOT NULL DEFAULT 0
);

-- 16. RFQ Attachments
CREATE TABLE rfq_attachments (
    id              BIGSERIAL    PRIMARY KEY,
    rfq_id          BIGINT       NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT         NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by     BIGINT       NOT NULL REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 17. RFQ ↔ Vendor Invitations (M:M)
CREATE TABLE rfq_vendor_invitations (
    rfq_id          BIGINT      NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id       BIGINT      NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at     TIMESTAMPTZ,
    PRIMARY KEY (rfq_id, vendor_id)
);

-- ---------------------------------------------------------------------------
-- SCHEMA: Quotations
-- ---------------------------------------------------------------------------

-- 18. Quotations (submitted by vendors against an RFQ)
CREATE TABLE quotations (
    id                BIGSERIAL        PRIMARY KEY,
    quotation_number  VARCHAR(30)      NOT NULL UNIQUE,   -- e.g. QT-2024-00001
    rfq_id            BIGINT           NOT NULL REFERENCES rfqs(id),
    vendor_id         BIGINT           NOT NULL REFERENCES vendors(id),
    status            quotation_status NOT NULL DEFAULT 'submitted',
    delivery_days     SMALLINT         NOT NULL CHECK (delivery_days > 0),
    validity_days     SMALLINT         NOT NULL DEFAULT 30,
    payment_terms     VARCHAR(255),
    currency          CHAR(3)          NOT NULL DEFAULT 'INR',
    notes             TEXT,
    submitted_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (rfq_id, vendor_id)   -- one quotation per vendor per RFQ
);

-- 19. Quotation Line Items (mirrors rfq_items with vendor pricing)
CREATE TABLE quotation_items (
    id              BIGSERIAL      PRIMARY KEY,
    quotation_id    BIGINT         NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    rfq_item_id     BIGINT         NOT NULL REFERENCES rfq_items(id),
    unit_price      NUMERIC(15,2)  NOT NULL CHECK (unit_price >= 0),
    quantity        NUMERIC(12,3)  NOT NULL CHECK (quantity > 0),
    tax_rate_id     INT            REFERENCES tax_rates(id),
    discount_pct    NUMERIC(5,2)   NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    line_total      NUMERIC(15,2)  GENERATED ALWAYS AS (
                        ROUND(quantity * unit_price * (1 - discount_pct / 100), 2)
                    ) STORED,
    notes           TEXT
);

-- 20. Quotation Item Taxes (one quotation line can have multiple tax rates)
CREATE TABLE quotation_item_taxes (
    quotation_item_id BIGINT NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
    tax_rate_id       INT    NOT NULL REFERENCES tax_rates(id),
    PRIMARY KEY (quotation_item_id, tax_rate_id)
);

-- 21. Quotation Attachments
CREATE TABLE quotation_attachments (
    id              BIGSERIAL    PRIMARY KEY,
    quotation_id    BIGINT       NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT         NOT NULL,
    file_size_bytes BIGINT,
    uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- SCHEMA: Approval Workflow
-- ---------------------------------------------------------------------------

-- 22. Approval Requests
CREATE TABLE approvals (
    id              BIGSERIAL       PRIMARY KEY,
    quotation_id    BIGINT          NOT NULL REFERENCES quotations(id),
    requested_by    BIGINT          NOT NULL REFERENCES users(id),
    assigned_to     BIGINT          NOT NULL REFERENCES users(id),  -- Manager/Approver
    status          approval_status NOT NULL DEFAULT 'pending',
    remarks         TEXT,
    actioned_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
-- Only one pending approval allowed per quotation at a time
CREATE UNIQUE INDEX IF NOT EXISTS uix_one_pending_approval
    ON approvals (quotation_id)
    WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- SCHEMA: Purchase Orders
-- ---------------------------------------------------------------------------

-- 22. Purchase Orders
CREATE TABLE purchase_orders (
    id                BIGSERIAL    PRIMARY KEY,
    po_number         VARCHAR(30)  NOT NULL UNIQUE,    -- e.g. PO-2024-00001
    quotation_id      BIGINT       NOT NULL UNIQUE REFERENCES quotations(id),
    vendor_id         BIGINT       NOT NULL REFERENCES vendors(id),
    created_by        BIGINT       NOT NULL REFERENCES users(id),
    status            po_status    NOT NULL DEFAULT 'draft',
    currency          CHAR(3)      NOT NULL DEFAULT 'INR',
    shipping_address  TEXT,
    delivery_deadline TIMESTAMPTZ,
    confirmed_at      TIMESTAMPTZ,
    delivered_at      TIMESTAMPTZ,
    notes             TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 23. PO Line Items (copied from accepted quotation items)
CREATE TABLE po_items (
    id                BIGSERIAL      PRIMARY KEY,
    po_id             BIGINT         NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    quotation_item_id BIGINT         NOT NULL REFERENCES quotation_items(id),
    item_name         VARCHAR(255)   NOT NULL,
    quantity          NUMERIC(12,3)  NOT NULL CHECK (quantity > 0),
    unit_id           INT            NOT NULL REFERENCES units_of_measure(id),
    unit_price        NUMERIC(15,2)  NOT NULL CHECK (unit_price >= 0),
    tax_rate_id       INT            REFERENCES tax_rates(id),
    discount_pct      NUMERIC(5,2)   NOT NULL DEFAULT 0,
    line_total        NUMERIC(15,2)  GENERATED ALWAYS AS (
                          ROUND(quantity * unit_price * (1 - discount_pct / 100), 2)
                      ) STORED
);

-- ---------------------------------------------------------------------------
-- SCHEMA: Invoices
-- ---------------------------------------------------------------------------

-- 24. Invoices
CREATE TABLE invoices (
    id              BIGSERIAL      PRIMARY KEY,
    invoice_number  VARCHAR(30)    NOT NULL UNIQUE,   -- e.g. INV-2024-00001
    po_id           BIGINT         NOT NULL UNIQUE REFERENCES purchase_orders(id),
    vendor_id       BIGINT         NOT NULL REFERENCES vendors(id),
    created_by      BIGINT         NOT NULL REFERENCES users(id),
    status          invoice_status NOT NULL DEFAULT 'generated',
    currency        CHAR(3)        NOT NULL DEFAULT 'INR',
    issue_date      DATE           NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE           NOT NULL,
    paid_date       DATE,
    subtotal        NUMERIC(15,2)  NOT NULL DEFAULT 0,
    total_discount  NUMERIC(15,2)  NOT NULL DEFAULT 0,
    total_tax       NUMERIC(15,2)  NOT NULL DEFAULT 0,
    grand_total     NUMERIC(15,2)  NOT NULL DEFAULT 0,
    notes           TEXT,
    pdf_url         TEXT,
    sent_at         TIMESTAMPTZ,
    sent_to_email   CITEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CHECK (due_date >= issue_date),
    CHECK (paid_date IS NULL OR paid_date >= issue_date)
);

-- 25. Invoice Line Items
CREATE TABLE invoice_items (
    id            BIGSERIAL      PRIMARY KEY,
    invoice_id    BIGINT         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    po_item_id    BIGINT         NOT NULL REFERENCES po_items(id),
    item_name     VARCHAR(255)   NOT NULL,
    quantity      NUMERIC(12,3)  NOT NULL CHECK (quantity > 0),
    unit_id       INT            NOT NULL REFERENCES units_of_measure(id),
    unit_price    NUMERIC(15,2)  NOT NULL CHECK (unit_price >= 0),
    tax_rate_id   INT            REFERENCES tax_rates(id),
    tax_amount    NUMERIC(15,2)  NOT NULL DEFAULT 0,
    discount_pct  NUMERIC(5,2)   NOT NULL DEFAULT 0,
    line_subtotal NUMERIC(15,2)  GENERATED ALWAYS AS (
                      ROUND(quantity * unit_price * (1 - discount_pct / 100), 2)
                  ) STORED,
    line_total    NUMERIC(15,2)  NOT NULL DEFAULT 0  -- subtotal + tax; set by trigger
);

-- ---------------------------------------------------------------------------
-- SCHEMA: Activity Logs (Audit Trail)
-- ---------------------------------------------------------------------------

-- 26. Activity Logs
CREATE TABLE activity_logs (
    id            BIGSERIAL       PRIMARY KEY,
    user_id       BIGINT          REFERENCES users(id) ON DELETE SET NULL,
    entity_type   activity_entity NOT NULL,
    entity_id     BIGINT          NOT NULL,
    action        VARCHAR(100)    NOT NULL,   -- e.g. 'created', 'status_changed', 'emailed'
    old_value     JSONB,
    new_value     JSONB,
    ip_address    INET,
    user_agent    TEXT,
    occurred_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_user   ON activity_logs (user_id);
CREATE INDEX idx_activity_time   ON activity_logs (occurred_at DESC);

-- ---------------------------------------------------------------------------
-- SCHEMA: Notifications
-- ---------------------------------------------------------------------------

-- 27. Notifications
CREATE TABLE notifications (
    id            BIGSERIAL       PRIMARY KEY,
    user_id       BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255)    NOT NULL,
    message       TEXT            NOT NULL,
    entity_type   activity_entity,
    entity_id     BIGINT,
    is_read       BOOLEAN         NOT NULL DEFAULT FALSE,
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user_unread ON notifications (user_id) WHERE is_read = FALSE;

-- ---------------------------------------------------------------------------
-- INDEXES for frequent query patterns
-- ---------------------------------------------------------------------------

CREATE INDEX idx_rfq_status          ON rfqs (status);
CREATE INDEX idx_rfq_created_by      ON rfqs (created_by);
CREATE INDEX idx_quotation_rfq       ON quotations (rfq_id);
CREATE INDEX idx_quotation_vendor    ON quotations (vendor_id);
CREATE INDEX idx_quotation_status    ON quotations (status);
CREATE INDEX idx_approval_assigned   ON approvals (assigned_to, status);
CREATE INDEX idx_po_vendor           ON purchase_orders (vendor_id);
CREATE INDEX idx_po_status           ON purchase_orders (status);
CREATE INDEX idx_invoice_vendor      ON invoices (vendor_id);
CREATE INDEX idx_invoice_status      ON invoices (status);
CREATE INDEX idx_invoice_due_date    ON invoices (due_date);
CREATE INDEX idx_vendor_status       ON vendors (status);
CREATE INDEX idx_vendor_user         ON vendors (user_id);

-- ---------------------------------------------------------------------------
-- SEQUENCES for human-readable document numbers
-- ---------------------------------------------------------------------------

CREATE SEQUENCE rfq_seq         START 1 INCREMENT 1;
CREATE SEQUENCE quotation_seq   START 1 INCREMENT 1;
CREATE SEQUENCE po_seq          START 1 INCREMENT 1;
CREATE SEQUENCE invoice_seq     START 1 INCREMENT 1;

-- ---------------------------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------------------------

-- F1: Generate padded document number  e.g. RFQ-2024-00042
CREATE OR REPLACE FUNCTION generate_doc_number(prefix TEXT, seq_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_val BIGINT;
BEGIN
    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
    RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_val::TEXT, 5, '0');
END;
$$;

-- F2: Recalculate invoice header totals from line items
CREATE OR REPLACE FUNCTION fn_recalculate_invoice_totals(p_invoice_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal    NUMERIC(15,2);
    v_total_disc  NUMERIC(15,2);
    v_total_tax   NUMERIC(15,2);
    v_grand_total NUMERIC(15,2);
BEGIN
    SELECT
        COALESCE(SUM(line_subtotal), 0),
        COALESCE(SUM(ROUND(quantity * unit_price * discount_pct / 100, 2)), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_total_disc, v_total_tax
    FROM invoice_items
    WHERE invoice_id = p_invoice_id;

    v_grand_total := v_subtotal + v_total_tax;

    UPDATE invoices
    SET
        subtotal       = v_subtotal,
        total_discount = v_total_disc,
        total_tax      = v_total_tax,
        grand_total    = v_grand_total,
        updated_at     = NOW()
    WHERE id = p_invoice_id;
END;
$$;

-- F3: Compute invoice_items.line_total = line_subtotal + tax_amount
CREATE OR REPLACE FUNCTION fn_compute_invoice_line_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_tax_rate NUMERIC(5,2) := 0;
BEGIN
    IF NEW.tax_rate_id IS NOT NULL THEN
        SELECT rate INTO v_tax_rate FROM tax_rates WHERE id = NEW.tax_rate_id;
    END IF;
    NEW.tax_amount := ROUND(NEW.line_subtotal * v_tax_rate / 100, 2);
    NEW.line_total := NEW.line_subtotal + NEW.tax_amount;
    RETURN NEW;
END;
$$;

-- F4: Sync invoice header totals after any line item insert / update / delete
CREATE OR REPLACE FUNCTION fn_sync_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM fn_recalculate_invoice_totals(OLD.invoice_id);
    ELSE
        PERFORM fn_recalculate_invoice_totals(NEW.invoice_id);
    END IF;
    RETURN NULL;
END;
$$;

-- F5: Auto-set updated_at on any table that has the column
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- F6: Generic activity log writer
CREATE OR REPLACE FUNCTION fn_log_activity(
    p_user_id     BIGINT,
    p_entity_type activity_entity,
    p_entity_id   BIGINT,
    p_action      TEXT,
    p_old         JSONB DEFAULT NULL,
    p_new         JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO activity_logs (user_id, entity_type, entity_id, action, old_value, new_value)
    VALUES (p_user_id, p_entity_type, p_entity_id, p_action, p_old, p_new);
END;
$$;

-- F7: Audit status changes — attached to key entity tables via triggers
CREATE OR REPLACE FUNCTION fn_audit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO activity_logs (entity_type, entity_id, action, old_value, new_value)
        VALUES (
            TG_ARGV[0]::activity_entity,
            NEW.id,
            'status_changed',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- F8: Mark overdue invoices; returns count of rows updated
CREATE OR REPLACE FUNCTION fn_mark_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'sent'
      AND due_date < CURRENT_DATE;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- F9: Vendor average rating placeholder (extend with a vendor_reviews table)
CREATE OR REPLACE FUNCTION fn_vendor_average_rating(p_vendor_id BIGINT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(AVG(rating), 0)
    FROM (
        SELECT 4.0::NUMERIC AS rating
        WHERE p_vendor_id IS NOT NULL
    ) r;
$$;

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

-- T1: Auto-generate RFQ number on insert
CREATE OR REPLACE FUNCTION fn_set_rfq_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.rfq_number IS NULL OR NEW.rfq_number = '' THEN
        NEW.rfq_number := generate_doc_number('RFQ', 'rfq_seq');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_rfq_number
    BEFORE INSERT ON rfqs
    FOR EACH ROW EXECUTE FUNCTION fn_set_rfq_number();

-- T2: Auto-generate Quotation number
CREATE OR REPLACE FUNCTION fn_set_quotation_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := generate_doc_number('QT', 'quotation_seq');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_quotation_number
    BEFORE INSERT ON quotations
    FOR EACH ROW EXECUTE FUNCTION fn_set_quotation_number();

-- T3: Auto-generate PO number
CREATE OR REPLACE FUNCTION fn_set_po_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := generate_doc_number('PO', 'po_seq');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION fn_set_po_number();

-- T4: Auto-generate Invoice number
CREATE OR REPLACE FUNCTION fn_set_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_doc_number('INV', 'invoice_seq');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_set_invoice_number();

-- T5: Compute invoice line totals (tax + grand) before insert/update
CREATE TRIGGER trg_invoice_item_totals
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION fn_compute_invoice_line_total();

-- T6: Sync invoice header totals after any line item change
CREATE TRIGGER trg_sync_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_totals();

-- T7: updated_at maintenance for all mutable tables
CREATE TRIGGER trg_users_updated_at           BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_vendors_updated_at         BEFORE UPDATE ON vendors         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_rfqs_updated_at            BEFORE UPDATE ON rfqs            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_quotations_updated_at      BEFORE UPDATE ON quotations      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_approvals_updated_at       BEFORE UPDATE ON approvals       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_po_updated_at              BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_invoices_updated_at        BEFORE UPDATE ON invoices        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- T8: Status audit triggers on key entities
CREATE TRIGGER trg_audit_rfq_status
    AFTER UPDATE ON rfqs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_status_change('rfq');

CREATE TRIGGER trg_audit_quotation_status
    AFTER UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_status_change('quotation');

CREATE TRIGGER trg_audit_approval_status
    AFTER UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION fn_audit_status_change('approval');

CREATE TRIGGER trg_audit_po_status
    AFTER UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION fn_audit_status_change('purchase_order');

CREATE TRIGGER trg_audit_invoice_status
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION fn_audit_status_change('invoice');

-- T9: Prevent quotation submission after RFQ deadline
CREATE OR REPLACE FUNCTION fn_check_rfq_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_deadline TIMESTAMPTZ;
    v_status   rfq_status;
BEGIN
    SELECT submission_deadline, status INTO v_deadline, v_status
    FROM rfqs WHERE id = NEW.rfq_id;

    IF v_status <> 'published' THEN
        RAISE EXCEPTION 'Quotations can only be submitted for published RFQs. Current status: %', v_status;
    END IF;
    IF NOW() > v_deadline THEN
        RAISE EXCEPTION 'Submission deadline has passed for RFQ id=%', NEW.rfq_id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_quotation_deadline_check
    BEFORE INSERT ON quotations
    FOR EACH ROW EXECUTE FUNCTION fn_check_rfq_deadline();

-- T10: Notify assigned approver on new approval request
CREATE OR REPLACE FUNCTION fn_notify_approver()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_quot_no VARCHAR;
BEGIN
    SELECT quotation_number INTO v_quot_no FROM quotations WHERE id = NEW.quotation_id;
    INSERT INTO notifications (user_id, title, message, entity_type, entity_id)
    VALUES (
        NEW.assigned_to,
        'New Approval Request',
        format('Quotation %s requires your approval.', v_quot_no),
        'approval',
        NEW.id
    );
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_approver
    AFTER INSERT ON approvals
    FOR EACH ROW EXECUTE FUNCTION fn_notify_approver();

-- T11: When approval → approved, mark quotation accepted and auto-create draft PO
CREATE OR REPLACE FUNCTION fn_create_po_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_quot quotations%ROWTYPE;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        SELECT * INTO v_quot FROM quotations WHERE id = NEW.quotation_id;

        -- Mark quotation accepted
        UPDATE quotations SET status = 'accepted', updated_at = NOW()
        WHERE id = NEW.quotation_id;

        -- Create draft PO (po_number auto-generated by T3)
        INSERT INTO purchase_orders (
            quotation_id, vendor_id, created_by, status, currency, delivery_deadline
        ) VALUES (
            v_quot.id,
            v_quot.vendor_id,
            NEW.requested_by,
            'draft',
            v_quot.currency,
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_create_po_on_approval
    AFTER UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION fn_create_po_on_approval();

-- ---------------------------------------------------------------------------
-- STORED PROCEDURES
-- ---------------------------------------------------------------------------

-- P1: Daily job — mark overdue invoices
CREATE OR REPLACE PROCEDURE proc_daily_invoice_overdue_check()
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    v_count := fn_mark_overdue_invoices();
    RAISE NOTICE 'Marked % invoice(s) as overdue.', v_count;
END;
$$;

-- P2: Copy quotation items → PO items when PO is being confirmed
CREATE OR REPLACE PROCEDURE proc_populate_po_items(p_po_id BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_quot_id BIGINT;
BEGIN
    SELECT quotation_id INTO v_quot_id FROM purchase_orders WHERE id = p_po_id;

    IF EXISTS (SELECT 1 FROM po_items WHERE po_id = p_po_id) THEN
        RAISE NOTICE 'PO items already populated for PO id=%.', p_po_id;
        RETURN;
    END IF;

    INSERT INTO po_items (
        po_id, quotation_item_id, item_name, quantity,
        unit_id, unit_price, tax_rate_id, discount_pct
    )
    SELECT
        p_po_id,
        qi.id,
        ri.item_name,
        qi.quantity,
        ri.unit_id,
        qi.unit_price,
        qi.tax_rate_id,
        qi.discount_pct
    FROM quotation_items qi
    JOIN rfq_items ri ON ri.id = qi.rfq_item_id
    WHERE qi.quotation_id = v_quot_id;
END;
$$;

-- P3: Generate invoice from a confirmed PO
CREATE OR REPLACE PROCEDURE proc_generate_invoice(
    p_po_id      BIGINT,
    p_created_by BIGINT,
    p_due_days   INT DEFAULT 30
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_po         purchase_orders%ROWTYPE;
    v_invoice_id BIGINT;
BEGIN
    SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;

    IF v_po.status <> 'confirmed' THEN
        RAISE EXCEPTION 'Invoice can only be generated for confirmed POs. Status: %', v_po.status;
    END IF;

    IF EXISTS (SELECT 1 FROM invoices WHERE po_id = p_po_id) THEN
        RAISE EXCEPTION 'Invoice already exists for PO id=%.', p_po_id;
    END IF;

    INSERT INTO invoices (po_id, vendor_id, created_by, currency, issue_date, due_date)
    VALUES (
        p_po_id,
        v_po.vendor_id,
        p_created_by,
        v_po.currency,
        CURRENT_DATE,
        CURRENT_DATE + p_due_days
    )
    RETURNING id INTO v_invoice_id;

    -- Populate invoice line items from PO items
    INSERT INTO invoice_items (
        invoice_id, po_item_id, item_name, quantity,
        unit_id, unit_price, tax_rate_id, discount_pct
    )
    SELECT
        v_invoice_id,
        pi.id,
        pi.item_name,
        pi.quantity,
        pi.unit_id,
        pi.unit_price,
        pi.tax_rate_id,
        pi.discount_pct
    FROM po_items pi
    WHERE pi.po_id = p_po_id;

    -- Totals recalculated automatically by trigger T6
    RAISE NOTICE 'Invoice id=% created for PO id=%.', v_invoice_id, p_po_id;
END;
$$;

-- P4: Close expired RFQs (run periodically via pg_cron or cron job)
CREATE OR REPLACE PROCEDURE proc_close_expired_rfqs()
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE rfqs
    SET status = 'closed', closed_at = NOW(), updated_at = NOW()
    WHERE status = 'published'
      AND submission_deadline < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Closed % expired RFQ(s).', v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- VIEWS (reporting helpers)
-- ---------------------------------------------------------------------------

-- V1: Procurement Officer dashboard summary
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM rfqs          WHERE status = 'published')                   AS active_rfqs,
    (SELECT COUNT(*) FROM approvals     WHERE status = 'pending')                     AS pending_approvals,
    (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft', 'confirmed'))     AS active_pos,
    (SELECT COUNT(*) FROM invoices      WHERE status IN ('generated', 'sent'))        AS open_invoices,
    (SELECT COALESCE(SUM(grand_total), 0) FROM invoices
       WHERE status = 'paid'
         AND DATE_TRUNC('month', paid_date) = DATE_TRUNC('month', CURRENT_DATE))     AS paid_this_month;

-- V2: Side-by-side quotation comparison per RFQ
CREATE OR REPLACE VIEW v_quotation_comparison AS
SELECT
    q.rfq_id,
    r.rfq_number,
    r.title                 AS rfq_title,
    q.id                    AS quotation_id,
    q.quotation_number,
    v.company_name          AS vendor_name,
    v.rating                AS vendor_rating,
    q.delivery_days,
    q.validity_days,
    q.payment_terms,
    q.currency,
    SUM(qi.line_total)      AS quoted_total,
    q.status
FROM quotations q
JOIN rfqs             r  ON r.id = q.rfq_id
JOIN vendors          v  ON v.id = q.vendor_id
JOIN quotation_items  qi ON qi.quotation_id = q.id
GROUP BY q.rfq_id, r.rfq_number, r.title, q.id, q.quotation_number,
         v.company_name, v.rating, q.delivery_days, q.validity_days,
         q.payment_terms, q.currency, q.status;

-- V3: Full invoice detail (joins vendors, PO, creator)
CREATE OR REPLACE VIEW v_invoice_detail AS
SELECT
    i.id                AS invoice_id,
    i.invoice_number,
    i.issue_date,
    i.due_date,
    i.paid_date,
    i.status,
    i.currency,
    i.subtotal,
    i.total_discount,
    i.total_tax,
    i.grand_total,
    po.po_number,
    v.company_name      AS vendor_name,
    v.email             AS vendor_email,
    v.gst_number        AS vendor_gst,
    u.full_name         AS created_by_name
FROM invoices i
JOIN purchase_orders po ON po.id = i.po_id
JOIN vendors         v  ON v.id  = i.vendor_id
JOIN users           u  ON u.id  = i.created_by;

-- V4: Vendor performance (spend + PO count)
CREATE OR REPLACE VIEW v_vendor_performance AS
SELECT
    v.id,
    v.company_name,
    v.rating,
    v.status,
    COUNT(DISTINCT po.id)             AS total_pos,
    COUNT(DISTINCT inv.id)            AS total_invoices,
    COALESCE(SUM(inv.grand_total), 0) AS total_spend,
    MAX(inv.issue_date)               AS last_invoice_date
FROM vendors v
LEFT JOIN purchase_orders po  ON po.vendor_id  = v.id AND po.status  = 'confirmed'
LEFT JOIN invoices        inv ON inv.vendor_id = v.id AND inv.status = 'paid'
GROUP BY v.id, v.company_name, v.rating, v.status;

-- ---------------------------------------------------------------------------
-- SEED DATA: Master / Lookup Tables
-- ---------------------------------------------------------------------------

INSERT INTO countries (code, name) VALUES
    ('IN', 'India'),
    ('US', 'United States'),
    ('GB', 'United Kingdom'),
    ('AE', 'United Arab Emirates'),
    ('SG', 'Singapore');

INSERT INTO states (country_id, code, name) VALUES
    (1, 'GJ', 'Gujarat'),
    (1, 'MH', 'Maharashtra'),
    (1, 'DL', 'Delhi'),
    (1, 'KA', 'Karnataka'),
    (1, 'TN', 'Tamil Nadu');

INSERT INTO units_of_measure (abbreviation, description) VALUES
    ('pcs',  'Pieces'),
    ('kg',   'Kilograms'),
    ('ltr',  'Litres'),
    ('m',    'Metres'),
    ('hr',   'Hours'),
    ('box',  'Box'),
    ('set',  'Set'),
    ('pair', 'Pair');

INSERT INTO tax_rates (name, rate) VALUES
    ('GST 0%',   0.00),
    ('GST 5%',   5.00),
    ('GST 12%',  12.00),
    ('GST 18%',  18.00),
    ('GST 28%',  28.00),
    ('IGST 18%', 18.00),
    ('TDS 2%',   2.00);

INSERT INTO vendor_categories (name, description) VALUES
    ('IT & Software',        'Technology products and software services'),
    ('Office Supplies',      'Stationery, furniture, and general office items'),
    ('Raw Materials',        'Manufacturing and production inputs'),
    ('Logistics',            'Shipping, warehousing, and freight services'),
    ('Professional Services','Consulting, legal, and advisory services'),
    ('Facilities',           'Maintenance, cleaning, and facility management'),
    ('Marketing',            'Advertising, printing, and media services');

INSERT INTO product_categories (parent_id, name) VALUES
    (NULL, 'Technology'),
    (NULL, 'Office'),
    (NULL, 'Operations'),
    (1,   'Hardware'),
    (1,   'Software Licenses'),
    (1,   'Cloud Services'),
    (2,   'Furniture'),
    (2,   'Stationery'),
    (3,   'Raw Materials'),
    (3,   'Packaging');

-- ---------------------------------------------------------------------------
-- SEED DATA: Demo Users (replace password_hash with real bcrypt in production)
-- ---------------------------------------------------------------------------

INSERT INTO users (email, password_hash, full_name, role) VALUES
    ('admin@vendorbridge.com',   '$2a$12$REPLACE_WITH_REAL_HASH', 'System Admin',        'admin'),
    ('officer@vendorbridge.com', '$2a$12$REPLACE_WITH_REAL_HASH', 'Procurement Officer', 'procurement_officer'),
    ('manager@vendorbridge.com', '$2a$12$REPLACE_WITH_REAL_HASH', 'Approval Manager',    'manager'),
    ('vendor@techsupply.com',    '$2a$12$REPLACE_WITH_REAL_HASH', 'TechSupply Contact',  'vendor');

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
