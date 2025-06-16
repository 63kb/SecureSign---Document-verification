using DataAccess;
using DataAccess.models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure; 
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text;

var builder = WebApplication.CreateBuilder(args);



builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DocumentDB")));


builder.Services.AddIdentity<ApplicationUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();



builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.User.RequireUniqueEmail = true;
});

// In Program.cs, add validation:
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtKey))
    throw new InvalidOperationException("JWT Key not configured");
if (string.IsNullOrEmpty(jwtIssuer))
    throw new InvalidOperationException("JWT Issuer not configured");
if (string.IsNullOrEmpty(jwtAudience))
    throw new InvalidOperationException("JWT Audience not configured");


//this will limit the size of the file that can be uploaded to 50MB
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50 * 1024 * 1024; // 50Mb
    options.MemoryBufferThreshold = int.MaxValue;
});

// Adding CORS policy 
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
             .AllowAnyMethod()
             .AllowAnyHeader();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
        ClockSkew = TimeSpan.FromMinutes(1) // Allow 1 minute clock skew
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine("Token validated successfully");
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Your API", Version = "v1" });
    c.OperationFilter<SwaggerFileOperationFilter>();
    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme.  
                        Enter 'Bearer' [space] and then your token in the text input below.  
                        Example: 'Bearer eyJhbGciOi...'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
    c.OperationFilter<AuthResponsesOperationFilter>();
});


builder.Services.AddLogging();
builder.Services.AddControllers();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Document API v1");
    });

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        
    }
}

app.UseHttpsRedirection();

// Must be in this exact order:
app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();  // This must come before Authorization
app.UseAuthorization();

app.MapControllers();
Console.WriteLine("Application is running on: " + app.Urls.FirstOrDefault());
app.Run();


public class SwaggerFileOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var fileUploadMime = "multipart/form-data";
        if (operation.RequestBody == null || !operation.RequestBody.Content.Any(x => x.Key.Equals(fileUploadMime, StringComparison.InvariantCultureIgnoreCase)))
            return;

        var fileParams = context.MethodInfo.GetParameters().Where(p => p.ParameterType == typeof(IFormFile));
        if (fileParams.Any())
        {
            operation.RequestBody.Content[fileUploadMime].Schema.Properties =
                fileParams.ToDictionary(
                    k => k.Name,
                    v => new OpenApiSchema()
                    {
                        Type = "string",
                        Format = "binary"
                    });
        }
    }
}