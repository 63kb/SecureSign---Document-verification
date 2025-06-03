using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using DataAccess.models; // Your models namespace

namespace DataAccess
{
    public class AppDbContext : IdentityDbContext<IdentityUser>
    {
        // Correct constructor
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) // Proper base call
        {
        }

        public DbSet<Document> Documents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}