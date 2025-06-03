using Microsoft.AspNet.Identity.EntityFramework;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Document
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    public byte[] Content { get; set; } = Array.Empty<byte>();

    public long Size { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;

    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey("UserId")]
    public virtual IdentityUser User { get; set; } = null!;

    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Category { get; set; } = "Uncategorized";
}