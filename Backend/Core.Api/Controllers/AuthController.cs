using DataAccess.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterModel model)
    {
        var user = new ApplicationUser { UserName = model.Email, Email = model.Email };
        var result = await _userManager.CreateAsync(user, model.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(new { Message = "User registered successfully" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginModel model)
    {
        var result = await _signInManager.PasswordSignInAsync(
            model.Email, model.Password, false, false);

        if (!result.Succeeded)
            return Unauthorized();

        var user = await _userManager.FindByEmailAsync(model.Email);
        var token = GenerateJwtToken(user);

        return Ok(new { 
            IsSuccess = true,
            Token = token,
            UserId = user.Id,
            Email = user.Email
        });
    }

    [HttpGet("validate")]
    [Authorize]
    public IActionResult ValidateToken()
    {
        // Ensure the token hasn't expired
        var expiryClaim = User.FindFirst(JwtRegisteredClaimNames.Exp);
        if (expiryClaim == null || !long.TryParse(expiryClaim.Value, out var expiryTime))
            return Unauthorized("Invalid token");

        var expiryDate = DateTimeOffset.FromUnixTimeSeconds(expiryTime).UtcDateTime;
        if (expiryDate < DateTime.UtcNow)
            return Unauthorized("Token expired");

        return Ok(new { UserId = User.FindFirstValue(ClaimTypes.NameIdentifier) });
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        var claims = new[]
        {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Use ID as subject
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
        new Claim(ClaimTypes.NameIdentifier, user.Id),
        new Claim(ClaimTypes.Email, user.Email)
    };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(Convert.ToDouble(_configuration["Jwt:ExpiryInMinutes"]));

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds   
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}