using System;
using System.ComponentModel.DataAnnotations;

namespace DataAccess.models
{
    public class Document
    {
        public int Id { get; set; }

        [Required]
        public string FileName { get; set; }

        public string ContentType { get; set; }

        public long Size { get; set; }

        public byte[] Content { get; set; }

        public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    }
}
