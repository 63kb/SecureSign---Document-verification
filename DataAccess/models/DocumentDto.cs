namespace DataAccess.models
{
    public class DocumentDto
    {
        public int Id { get; set; }
        public required string FileName { get; set; }
        public required string ContentType { get; set; }
        public long Size { get; set; }
        public DateTime UploadDate { get; set; }
        public required string Description { get; set; }
        public required string Category { get; set; }
        public bool IsOwner { get; set; }

        public string FormattedSize => Size switch
        {
            _ when Size < 1024 => $"{Size} bytes",
            _ when Size < 1048576 => $"{Size / 1024} KB",
            _ => $"{Size / 1048576} MB"
        };
    }
}