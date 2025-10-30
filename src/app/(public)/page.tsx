export default function HomePage() {
  return (
    <div className="text-center">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Core Systems Broker
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Secure authentication and token management service for Core Health Systems
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Service Overview
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Authentication
              </h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Auth0 EU integration</li>
                <li>• Multi-tenant support</li>
                <li>• Role-based access control</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Token Management
              </h3>
              <ul className="text-gray-600 space-y-1">
                <li>• RS256 JWT signing</li>
                <li>• Short-lived tokens (5 min)</li>
                <li>• Scope-based permissions</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Security
              </h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Rate limiting</li>
                <li>• Audit logging</li>
                <li>• CORS protection</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Monitoring
              </h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Health checks</li>
                <li>• JWKS endpoint</li>
                <li>• Comprehensive logging</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            API Endpoints
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded p-3">
              <code className="text-green-600 font-mono">POST /api/tokens/mint</code>
              <p className="text-gray-600 mt-1">Issue JWT tokens</p>
            </div>
            <div className="bg-white rounded p-3">
              <code className="text-green-600 font-mono">GET /.well-known/jwks.json</code>
              <p className="text-gray-600 mt-1">Public key endpoint</p>
            </div>
            <div className="bg-white rounded p-3">
              <code className="text-green-600 font-mono">GET /api/health</code>
              <p className="text-gray-600 mt-1">Service health status</p>
            </div>
            <div className="bg-white rounded p-3">
              <code className="text-green-600 font-mono">GET /api/sanity</code>
              <p className="text-gray-600 mt-1">Configuration check</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

