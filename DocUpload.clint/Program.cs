using DocUpload.clint; // Add this namespace
using Microsoft.AspNetCore.Components.Authorization; // Add this
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Blazored.LocalStorage; // Add this

var builder = WebAssemblyHostBuilder.CreateDefault(args);

// Register HttpClient with auth handler
builder.Services.AddScoped<AuthHeaderHandler>();
builder.Services.AddScoped(sp => {
    var handler = sp.GetRequiredService<AuthHeaderHandler>();
    handler.InnerHandler = new HttpClientHandler();
    return new HttpClient(handler)
    {
        BaseAddress = new Uri("https://localhost:7218")
    };
});

// Add authentication services
builder.Services.AddBlazoredLocalStorage();
builder.Services.AddOptions();
builder.Services.AddAuthorizationCore();
builder.Services.AddScoped<AuthenticationStateProvider, JwtAuthStateProvider>();

// Register your custom services
builder.Services.AddScoped<AuthService>();

await builder.Build().RunAsync();