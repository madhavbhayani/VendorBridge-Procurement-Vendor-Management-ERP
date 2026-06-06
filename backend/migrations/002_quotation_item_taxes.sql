CREATE TABLE IF NOT EXISTS quotation_item_taxes (
    quotation_item_id BIGINT NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
    tax_rate_id       INT    NOT NULL REFERENCES tax_rates(id),
    PRIMARY KEY (quotation_item_id, tax_rate_id)
);

INSERT INTO quotation_item_taxes (quotation_item_id, tax_rate_id)
SELECT id, tax_rate_id
FROM quotation_items
WHERE tax_rate_id IS NOT NULL
ON CONFLICT DO NOTHING;
