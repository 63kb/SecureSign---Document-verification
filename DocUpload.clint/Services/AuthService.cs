using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Authorization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using static DocUpload.clint.Pages.Register;

public class AuthService
{
    private readonly HttpClient _http;
    private readonly ILocalStorageService _localStorage;
    private readonly AuthenticationStateProvider _authStateProvider;

    public AuthService(
        HttpClient http,
        ILocalStorageService localStorage,
        AuthenticationStateProvider authStateProvider)
    {
        _http = http;
        _localStorage = localStorage;
        _authStateProvider = authStateProvider;
    }
    public async Task<HttpResponseMessage> Register(RegisterModel model)
    {
        try
        {
            return await _http.PostAsJsonAsync("api/auth/register", new
            {
                Email = model.Email,
                Password = model.Password
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Registration error: {ex.Message}");
            return new HttpResponseMessage(HttpStatusCode.InternalServerError);
        }
    }
    public async Task<LoginResult> Login(string email, string password)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("api/auth/login", new { email, password });
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new LoginResult
                {
                    IsSuccess = false,
                    Message = "Invalid login attempt"
                };
            }

            var loginResult = JsonSerializer.Deserialize<LoginResult>(responseContent);

            if (loginResult?.IsSuccess == true && !string.IsNullOrEmpty(loginResult.Token))
            {
                await _localStorage.SetItemAsync("authToken", loginResult.Token);
                await ((JwtAuthStateProvider)_authStateProvider).NotifyUserAuthentication(loginResult.Token);
            }

            return loginResult ?? new LoginResult { IsSuccess = false, Message = "Invalid response" };
        }
        catch (Exception ex)
        {
            return new LoginResult
            {
                IsSuccess = false,
                Message = ex.Message
            };
        }
    }

    public async Task Logout()
    {
        await _localStorage.RemoveItemAsync("authToken");
        await ((JwtAuthStateProvider)_authStateProvider).NotifyUserLogout();
        _http.DefaultRequestHeaders.Authorization = null;
    }

    public async Task<bool> IsAuthenticated()
    {
        try
        {
            var token = await _localStorage.GetItemAsync<string>("authToken");
            return !string.IsNullOrEmpty(token);
        }
        catch
        {
            return false;
        }
    }
}

public class LoginResult
{
    public bool IsSuccess { get; set; }
    public string? Token { get; set; }
    public string? UserId { get; set; }
    public string? Email { get; set; }
    public string? Message { get; set; } // For error cases
}