import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
          Welcome to <span className="text-green-600">VendorBridge</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          The ultimate platform for streamlining your enterprise vendor management and procurement operations.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link 
            href="/login" 
            className="w-full sm:w-auto px-8 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors shadow-sm"
          >
            Sign In to Portal
          </Link>
          <Link 
            href="/signup" 
            className="w-full sm:w-auto px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Register Company
          </Link>
        </div>
      </div>
    </div>
  );
}
