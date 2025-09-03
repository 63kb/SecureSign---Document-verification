using DocUpload.clint; // Add this namespace
using Microsoft.AspNetCore.Components.Authorization; 
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Blazored.LocalStorage;
using Microsoft.Extensions.Http;
using Polly;

var builder = WebAssemblyHostBuilder.CreateDefault(args);


builder.Services.AddScoped<AuthHeaderHandler>();

builder.Services.AddScoped(sp => new HttpClient
{
    BaseAddress = new Uri(builder.HostEnvironment.BaseAddress)
});


builder.Services.AddBlazoredLocalStorage();
builder.Services.AddHttpClient("RetryClient", client =>
{
    client.BaseAddress = new Uri("https://localhost:5048");
})
.AddPolicyHandler(Policy
    .Handle<HttpRequestException>()
    .OrResult<HttpResponseMessage>(r => !r.IsSuccessStatusCode)
    .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromMilliseconds(300))
);
builder.Services.AddOptions();
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<AuthenticationStateProvider, JwtAuthStateProvider>();

// Register your custom services
builder.Services.AddScoped<AuthService>();

await builder.Build().RunAsync();