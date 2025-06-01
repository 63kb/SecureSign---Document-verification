using DataAccess.models;
using DataAccess;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Mime;
using System.Data.Entity;

namespace Core.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DocumentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DocumentsController> _logger;
        private const long MaxFileSize = 50 * 1024 * 1024; // 50MB limit

        public DocumentsController(AppDbContext context, ILogger<DocumentsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSize)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxFileSize)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            using (var memoryStream = new MemoryStream())
            {
                await file.CopyToAsync(memoryStream);

                var document = new Document
                {
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    Size = file.Length,
                    Content = memoryStream.ToArray(),  
                    UploadDate = DateTime.UtcNow      
                };

                await _context.Documents.AddAsync(document);  
                await _context.SaveChangesAsync();            

                _logger.LogInformation("Document {DocumentId} uploaded successfully", document.Id);

                return Ok(new
                {
                    document.Id,
                    document.FileName,
                    document.Size,
                    document.ContentType  // Fixed from contentFunc to ContentType
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Download(int id)
        {
            try
            {
                var document = await _context.Documents.FindAsync(id);
                if (document == null)
                {
                    _logger.LogWarning("Document {DocumentId} not found", id);
                    return NotFound();
                }

                var contentDisposition = new ContentDisposition
                {
                    FileName = document.FileName,
                    Inline = false // Force download
                };
                Response.Headers.Add("Content-Disposition", contentDisposition.ToString());

                return File(document.Content, document.ContentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading document {DocumentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}