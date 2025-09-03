using DataAccess;
using DataAccess.models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Annotations;
using System.IO;
using System.Linq;
using System.Net.Mime;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Core.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DocumentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DocumentsController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;
        private const long MaxFileSize = 100 * 1024 * 1024; // 50MB limit

        public DocumentsController(
            AppDbContext context,
            ILogger<DocumentsController> logger,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _logger = logger;
            _userManager = userManager;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSize)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxFileSize)]
        [SwaggerOperation(
                Summary = "Upload a PDF document",
                Description = "Uploads a PDF document with optional metadata",
                OperationId = "UploadDocument")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> Upload(
            [FromForm] IFormFile file,
            [FromForm] string description = null,
            [FromForm] string category = "Uncategorized")
        {
            try
            {
                // Get user ID from JWT claims
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized upload attempt - no user ID in claims");
                    return Unauthorized(new { Message = "Authentication required" });
                }

                // Validate user exists
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("Upload attempt by non-existent user {UserId}", userId);
                    return Unauthorized(new { Message = "User not found" });
                }

                // Validation
                if (file == null || file.Length == 0)
                    return BadRequest("No file provided");

                if (file.Length > MaxFileSize)
                    return BadRequest($"File exceeds {MaxFileSize / 1024 / 1024}MB limit");

                var allowedContentTypes = new[] { "application/pdf", "text/plain" };
                if (!allowedContentTypes.Contains(file.ContentType))
                    return BadRequest("Invalid file type");

                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (fileExtension != ".pdf")
                {
                    return BadRequest("Only .pdf files are allowed");
                }

                // Process file
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);

                var document = new Document
                {
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    Size = file.Length,
                    Content = memoryStream.ToArray(),
                    UserId = userId,
                    Description = description??"no_description",
                    Category = category,
                    UploadDate = DateTime.UtcNow
                };

                await _context.Documents.AddAsync(document);
                await _context.SaveChangesAsync();

                return Ok(new DocumentDto
                {
                    Id = document.Id,
                    FileName = document.FileName,
                    ContentType = document.ContentType,
                    Size = document.Size,
                    UploadDate = document.UploadDate,
                    Description = document.Description,
                    Category = document.Category
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading document for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
                return StatusCode(500, new { Message = "Internal server error" });
            }
        }

        [HttpGet("{id}/download")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Download(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                _logger.LogInformation("Download attempt for document {DocumentId} by user {UserId}", id, userId);
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unauthorized download attempt - no user ID in claims");
                    return Unauthorized("Authentication required");
                }

                var document = await _context.Documents
                    .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

                if (document == null)
                {
                    _logger.LogWarning("Document {DocumentId} not found or access denied for user {UserId}", id, userId);
                    return NotFound("Document not found or access denied");
                }

                return File(document.Content, document.ContentType, document.FileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading document {DocumentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUserDocuments()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var documents = await _context.Documents
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.UploadDate)
                .Select(d => new DocumentDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    ContentType = d.ContentType,
                    Size = d.Size,
                    UploadDate = d.UploadDate,
                    Description = d.Description,
                    Category = d.Category
                })
                .ToListAsync();

            return Ok(documents);
        }

        [HttpGet("{id}/metadata")]
        public async Task<IActionResult> GetDocumentMetadata(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var document = await _context.Documents
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

            if (document == null)
                return NotFound();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized();

            var metadata = new
            {
                document.Id,
                document.FileName,
                document.ContentType,
                document.Size,
                document.UploadDate,
                document.Description,
                document.Category,
                User = new
                
                {
                    Id = user.Id,
                    UserName = user.UserName,
                    Email = user.Email
                }
            };

            return Ok(metadata);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                var document = await _context.Documents
                    .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

                if (document == null)
                    return NotFound();

                _context.Documents.Remove(document);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Document {DocumentId} deleted by user {UserId}", id, userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting document {DocumentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }
    }

  
}