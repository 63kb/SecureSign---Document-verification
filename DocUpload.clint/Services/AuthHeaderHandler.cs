using Blazored.LocalStorage;
using System.Net;
using System.Net.Http.Headers;

public class AuthHeaderHandler : DelegatingHandler
{
    private readonly ILocalStorageService _localStorage;
    private readonly JwtAuthStateProvider _authStateProvider; // Add this field

    public AuthHeaderHandler(ILocalStorageService localStorage, JwtAuthStateProvider authStateProvider) // Update constructor
    {
        _localStorage = localStorage;
        _authStateProvider = authStateProvider; // Initialize the field
    }

    protected override async Task<HttpResponseMessage> SendAsync(
    HttpRequestMessage request,
    CancellationToken cancellationToken)
    {
        // Skip auth for login/register endpoints
        if (request.RequestUri.AbsolutePath.Contains("/auth"))
            return await base.SendAsync(request, cancellationToken);

        var token = await _localStorage.GetItemAsync<string>("authToken");
        if (!string.IsNullOrEmpty(token))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await base.SendAsync(request, cancellationToken);

        // Auto-logout on 401
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            await _authStateProvider.NotifyUserLogout(); // Use the initialized field
        }

        return response; // Fix duplicate SendAsync call
    }
}