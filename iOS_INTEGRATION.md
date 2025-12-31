# iOS App Integration Guide

This guide shows how to integrate the Raastaa iOS app with the new backend API.

## 🔗 Backend Connection

### 1. Update Base URL

In `raastaa-app/raastaaPackage/Sources/raastaaFeature/Services/Backend.swift`:

```swift
enum Backend {
    // Development
    static let baseURL = "http://localhost:3000/api/v1"
    
    // Production (after deployment)
    // static let baseURL = "https://api.raastaa.com/api/v1"
}
```

For iOS Simulator: Use `http://localhost:3000`
For Physical Device: Use `http://YOUR_COMPUTER_IP:3000`

---

## 🔐 Authentication Integration

### Update AuthService.swift

Replace mock implementations with real API calls:

```swift
import Foundation

@MainActor
@Observable
class AuthService {
    var currentUser: User?
    var isAuthenticated: Bool { currentUser != nil }
    
    private let apiClient: APIClient
    private let keychainKey = "raastaa.auth.token"
    
    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
        loadStoredAuth()
    }
    
    // MARK: - Sign Up
    func signUp(email: String, password: String, username: String, displayName: String) async throws {
        let endpoint = "/auth/signup"
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "username": username,
            "displayName": displayName
        ]
        
        let response: SignUpResponse = try await apiClient.post(endpoint, body: body)
        
        // Store tokens in Keychain
        storeTokens(access: response.tokens.accessToken, refresh: response.tokens.refreshToken)
        
        // Update current user
        currentUser = response.user
    }
    
    // MARK: - Login
    func login(emailOrPhone: String, password: String) async throws {
        let endpoint = "/auth/login"
        let body: [String: Any] = [
            "emailOrPhone": emailOrPhone,
            "password": password
        ]
        
        let response: LoginResponse = try await apiClient.post(endpoint, body: body)
        
        storeTokens(access: response.tokens.accessToken, refresh: response.tokens.refreshToken)
        currentUser = response.user
    }
    
    // MARK: - Logout
    func logout() async {
        // Call backend logout endpoint
        try? await apiClient.post("/auth/logout", body: [:] as [String: String])
        
        // Clear local data
        clearTokens()
        currentUser = nil
    }
    
    // MARK: - Token Management
    private func storeTokens(access: String, refresh: String) {
        // Store in iOS Keychain
        let tokens = ["access": access, "refresh": refresh]
        if let data = try? JSONEncoder().encode(tokens) {
            KeychainHelper.save(key: keychainKey, data: data)
        }
    }
    
    private func loadStoredAuth() {
        guard let data = KeychainHelper.load(key: keychainKey),
              let tokens = try? JSONDecoder().decode([String: String].self, from: data) else {
            return
        }
        
        // Validate token and fetch user
        Task {
            try? await fetchCurrentUser()
        }
    }
    
    private func fetchCurrentUser() async throws {
        let response: UserResponse = try await apiClient.get("/auth/me")
        currentUser = response.user
    }
    
    private func clearTokens() {
        KeychainHelper.delete(key: keychainKey)
    }
}

// Response models
struct SignUpResponse: Decodable {
    let user: User
    let tokens: Tokens
}

struct LoginResponse: Decodable {
    let user: User
    let tokens: Tokens
}

struct UserResponse: Decodable {
    let user: User
}

struct Tokens: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}
```

---

## 🗺️ Vendor Service Integration

### Update VendorService.swift

```swift
import Foundation
import CoreLocation

@MainActor
@Observable
class VendorService {
    private let apiClient: APIClient
    
    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }
    
    // MARK: - Find Nearby Vendors
    func findNearby(
        coordinate: CLLocationCoordinate2D,
        radiusKm: Double = 5.0,
        tags: [String] = [],
        priceBands: [String] = []
    ) async throws -> [Vendor] {
        var params: [String: String] = [
            "lat": "\(coordinate.latitude)",
            "lng": "\(coordinate.longitude)",
            "radiusKm": "\(radiusKm)"
        ]
        
        // Add filters
        if !tags.isEmpty {
            params["tags[]"] = tags.joined(separator: ",")
        }
        if !priceBands.isEmpty {
            params["priceBands[]"] = priceBands.joined(separator: ",")
        }
        
        let response: NearbyVendorsResponse = try await apiClient.get(
            "/vendors/nearby",
            parameters: params
        )
        
        return response.vendors
    }
    
    // MARK: - Get Vendor Details
    func getVendor(id: String) async throws -> VendorDetail {
        let response: VendorDetailResponse = try await apiClient.get("/vendors/\(id)")
        return response.vendor
    }
    
    // MARK: - Search Vendors
    func search(query: String) async throws -> [Vendor] {
        let response: SearchVendorsResponse = try await apiClient.get(
            "/vendors/search",
            parameters: ["q": query]
        )
        return response.vendors
    }
    
    // MARK: - Get Featured Vendors
    func getFeatured() async throws -> [Vendor] {
        let response: FeaturedVendorsResponse = try await apiClient.get("/vendors/featured")
        return response.vendors
    }
}

// Response models
struct NearbyVendorsResponse: Decodable {
    let vendors: [Vendor]
    let total: Int
}

struct VendorDetailResponse: Decodable {
    let vendor: VendorDetail
}

struct SearchVendorsResponse: Decodable {
    let vendors: [Vendor]
}

struct FeaturedVendorsResponse: Decodable {
    let vendors: [Vendor]
}

// Enhanced Vendor model with distance
struct Vendor: Identifiable, Decodable {
    let id: String
    let name: String
    let description: String?
    let priceBand: String?
    let isVerified: Bool
    let popularityScore: Double
    let latitude: Double
    let longitude: Double
    let city: String?
    let area: String?
    let distanceMeters: Double?
    let tags: [Tag]
}

struct VendorDetail: Identifiable, Decodable {
    let id: String
    let name: String
    let description: String?
    let priceBand: String?
    let isVerified: Bool
    let location: Location
    let operationalInfo: OperationalInfo?
    let tags: [Tag]
    let menuItems: [MenuItem]
    let reviewStats: ReviewStats
    let userReview: Review?
}

struct Tag: Identifiable, Decodable {
    let id: String
    let name: String
    let category: String
}

struct MenuItem: Identifiable, Decodable {
    let id: String
    let name: String
    let description: String?
    let priceMin: Double?
    let priceMax: Double?
    let currency: String
    let isAvailable: Bool
}

struct ReviewStats: Decodable {
    let averageScore: Double
    let totalReviews: Int
}
```

---

## 💰 Wallet Service Integration

### Update WalletService.swift

```swift
@MainActor
@Observable
class WalletService {
    var balance: Int = 0
    var transactions: [WalletTransaction] = []
    
    private let apiClient: APIClient
    
    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }
    
    // MARK: - Fetch Wallet
    func fetchWallet() async throws {
        let response: WalletResponse = try await apiClient.get("/wallet")
        balance = response.wallet.balance
    }
    
    // MARK: - Fetch Transactions
    func fetchTransactions() async throws {
        let response: TransactionsResponse = try await apiClient.get("/wallet/transactions")
        transactions = response.transactions
    }
}

struct WalletResponse: Decodable {
    let wallet: Wallet
}

struct TransactionsResponse: Decodable {
    let transactions: [WalletTransaction]
}

struct Wallet: Decodable {
    let id: String
    let userId: String
    let balance: Int
    let currency: String
}

struct WalletTransaction: Identifiable, Decodable {
    let id: String
    let amount: Int
    let reason: String
    let referenceType: String?
    let referenceId: String?
    let balanceAfter: Int
    let createdAt: String
}
```

---

## 🌐 API Client Implementation

### Create/Update APIClient.swift

```swift
import Foundation

class APIClient {
    static let shared = APIClient()
    
    private let baseURL = Backend.baseURL
    private let session = URLSession.shared
    
    // MARK: - GET Request
    func get<T: Decodable>(
        _ endpoint: String,
        parameters: [String: String] = [:]
    ) async throws -> T {
        var components = URLComponents(string: baseURL + endpoint)!
        if !parameters.isEmpty {
            components.queryItems = parameters.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        addHeaders(to: &request)
        
        return try await performRequest(request)
    }
    
    // MARK: - POST Request
    func post<T: Decodable>(
        _ endpoint: String,
        body: [String: Any]
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        addHeaders(to: &request)
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        return try await performRequest(request)
    }
    
    // MARK: - PUT Request
    func put<T: Decodable>(
        _ endpoint: String,
        body: [String: Any]
    ) async throws -> T {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        addHeaders(to: &request)
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        return try await performRequest(request)
    }
    
    // MARK: - DELETE Request
    func delete(
        _ endpoint: String
    ) async throws {
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        addHeaders(to: &request)
        
        let _: EmptyResponse = try await performRequest(request)
    }
    
    // MARK: - Private Helpers
    private func addHeaders(to request: inout URLRequest) {
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add JWT token if available
        if let token = getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }
    
    private func performRequest<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            // Handle specific error codes
            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error:", error)
            throw APIError.decodingError
        }
    }
    
    private func getAccessToken() -> String? {
        guard let data = KeychainHelper.load(key: "raastaa.auth.token"),
              let tokens = try? JSONDecoder().decode([String: String].self, from: data) else {
            return nil
        }
        return tokens["access"]
    }
}

// MARK: - API Errors
enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(Int)
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .unauthorized: return "Unauthorized - please login again"
        case .serverError(let code): return "Server error: \(code)"
        case .decodingError: return "Failed to decode response"
        }
    }
}

// Empty response for DELETE requests
struct EmptyResponse: Decodable {}
```

---

## 🔐 Keychain Helper

### Create KeychainHelper.swift

```swift
import Security
import Foundation

struct KeychainHelper {
    static func save(key: String, data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    static func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }
    
    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
```

---

## ✅ Testing Integration

### 1. Start Backend
```bash
cd /Users/murali/Desktop/raasta-all/raastaa-backend
npm run dev
```

### 2. Update iOS App
```bash
cd /Users/murali/Desktop/raasta-all/raastaa-app
# Make the changes above
```

### 3. Run iOS App
- Open `raastaa.xcworkspace` in Xcode
- Build and run on Simulator
- Test signup/login flow
- Test vendor discovery

### 4. Check Backend Logs
Monitor backend terminal for API requests

---

## 🐛 Troubleshooting

### "Cannot connect to localhost:3000"
- Ensure backend is running: `npm run dev`
- Check firewall settings
- For physical device, use computer's IP address

### "401 Unauthorized"
- Check if token is being sent
- Token may have expired - implement refresh logic
- Check Keychain storage

### "Decoding error"
- Check API response format matches Swift models
- Use `convertFromSnakeCase` key decoding strategy
- Print raw JSON for debugging

---

## 📝 Checklist

- [ ] Update `Backend.swift` with correct base URL
- [ ] Implement `APIClient.swift` with JWT token handling
- [ ] Update `AuthService.swift` to use real API
- [ ] Update `VendorService.swift` to use real API
- [ ] Update `WalletService.swift` to use real API
- [ ] Implement `KeychainHelper.swift` for secure token storage
- [ ] Remove mock data and UserDefaults persistence
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test vendor discovery
- [ ] Test wallet balance
- [ ] Handle errors gracefully
- [ ] Implement token refresh logic

---

## 🎯 Next Steps

After basic integration:
1. Implement review creation
2. Add feed functionality
3. Implement wallet transactions display
4. Add media upload
5. Integrate push notifications

---

For questions, refer to:
- Backend API Docs: `raastaa-backend/docs/API_DOCS.md`
- Backend README: `raastaa-backend/README.md`
