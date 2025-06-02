using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DataAccess.models
{
    public class Document
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public required string FileName { get; set; }

        [Required]
        [MaxLength(100)]
        public required string ContentType { get; set; }

        [Required]
        public required byte[] Content { get; set; }

        public long Size { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public DateTime UploadDate { get; set; } = DateTime.UtcNow;

        [Required]
        public required string UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual required IdentityUser User { get; set; } // Changed to virtual for lazy loading

        // Additional useful properties
        public required string Description { get; set; }

        [MaxLength(50)]
        public required string Category { get; set; }

        public List<DocumentPermission> Permissions { get; set; } = new();
    }
    public class DocumentPermission
    {
        public int Id { get; set; }
        public required string UserId { get; set; }  // User who has access
        public int DocumentId { get; set; }
        public virtual required Document Document { get; set; }
    }
}