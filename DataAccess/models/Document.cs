using System;
using System.ComponentModel.DataAnnotations;

namespace DataAccess.models
{
    public class Document
    {
        [Key]
        public int Id { get; set; }

        public string FileName { get; set; }

        public string FileType { get; set; }

        public string FilePath { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.Now;
    }
}
