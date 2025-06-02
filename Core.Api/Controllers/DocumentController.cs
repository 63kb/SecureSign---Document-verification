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
        private readonly UserManager<IdentityUser> _userManager;
        private const long MaxFileSize = 50 * 1024 * 1024; // 50MB limit

        public DocumentsController(
            AppDbContext context,
            ILogger<DocumentsController> logger,
            UserManager<IdentityUser> userManager)
        {
            _context = context;
            _logger = logger;
            _userManager = userManager;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSize)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxFileSize)]
        [SwaggerOperation(
                Summary = "Upload a document",
                Description = "Uploads a document with optional metadata",
                OperationId = "UploadDocument")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(DocumentDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Upload(
            [FromForm] IFormFile file,
            [FromForm] string description = null,
            [FromForm] string category = "Uncategorized")
        {
            try
            {
                // Validation
                if (file == null || file.Length == 0)
                    return BadRequest("No file provided");

                if (file.Length > MaxFileSize)
                    return BadRequest($"File exceeds {MaxFileSize/1024/1024}MB limit");

                var allowedTypes = new[] {
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                };

                if (!allowedTypes.Contains(file.ContentType))
                    return BadRequest("Invalid file type");
                var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx" };
                var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

                if (!allowedExtensions.Contains(fileExtension))
                {
                    return BadRequest("Invalid file extension");
                }
                // Process file
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                var document = new Document
                {
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    Size = file.Length,
                    Content = memoryStream.ToArray(),
                    UserId = userId,
                    User = await _userManager.FindByIdAsync(userId), // Fix: Set the required 'User' property
                    Description = description,
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
                _logger.LogError(ex, "Error uploading document");
                return StatusCode(500, "Internal server error");
            }
        }
        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(int id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var document = await _context.Documents
                    .Include(d => d.Permissions)
                    .FirstOrDefaultAsync(d => d.Id == id &&
                        (d.UserId == userId ||
                         d.Permissions.Any(p => p.UserId == userId)));

                if (document == null)
                {
                    _logger.LogWarning("Document {DocumentId} not found or access denied for user {UserId}", id, userId);
                    return NotFound();
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
                .Where(d => d.UserId == userId ||
                           d.Permissions.Any(p => p.UserId == userId))
                .OrderByDescending(d => d.UploadDate)
                .Select(d => new DocumentDto
                {
                    Id = d.Id,
                    FileName = d.FileName,
                    ContentType = d.ContentType,
                    Size = d.Size,
                    UploadDate = d.UploadDate,
                    Description = d.Description,
                    Category = d.Category,
                    IsOwner = d.UserId == userId // Add this to distinguish owned vs shared
                })
                .ToListAsync();

            return Ok(documents);
        }

        [HttpPost("{id}/share")]
        public async Task<IActionResult> ShareDocument(
    int id,
    [FromBody] ShareRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var document = await _context.Documents
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

            if (document == null) return NotFound();

            // Check if permission already exists
            var existingPermission = await _context.DocumentPermissions
                .FirstOrDefaultAsync(p => p.DocumentId == id && p.UserId == request.TargetUserId);

            if (existingPermission != null)
            {
                return BadRequest("Document is already shared with this user");
            }

            var permission = new DocumentPermission
            {
                DocumentId = id,
                UserId = request.TargetUserId,
                Document = document
            };

            _context.DocumentPermissions.Add(permission);
            await _context.SaveChangesAsync();

            return Ok();
        }

        // DTO class (add to DataAccess/models)
        public class ShareRequest
        {
            public required string TargetUserId { get; set; }
        }
        [HttpGet("{id}/metadata")]
        public async Task<IActionResult> GetDocumentMetadata(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var document = await _context.Documents
                .Include(d => d.User) // Ensure the User property is loaded
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

            if (document == null)
                return NotFound();

            var metadata = new
            {
                document.Id,
                UserDetails = await _userManager.FindByIdAsync(userId)
                       ?? throw new InvalidOperationException("User not found"), 
                document.FileName,
                document.ContentType,
                document.Size,
                document.UploadDate,
                document.Description,
                document.Category,
                User = new
                {
                    Id = document.User.Id,
                    UserName = document.User.UserName,
                    Email = document.User.Email
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