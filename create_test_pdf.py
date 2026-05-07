from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

# Create a test PDF
output_path = Path("test_judgment.pdf")
c = canvas.Canvas(str(output_path), pagesize=letter)
c.setFont("Helvetica", 12)

# Add test content
y = 10 * inch
c.drawString(0.5 * inch, y, "DISTRICT COURT JUDGMENT")
y -= 0.3 * inch

c.drawString(0.5 * inch, y, "Date: 15 Apr 2026")
y -= 0.5 * inch

c.drawString(0.5 * inch, y, "Case: Hemaraj K Jain vs The Special Land Acquisition Officer")
y -= 0.5 * inch

c.drawString(0.5 * inch, y, "ORDER:")
y -= 0.3 * inch

text_lines = [
    "1. The District Collector shall submit a compliance report within 30 days.",
    "",
    "2. The petition is dismissed, and the State may file an appeal within 90 days of judgment.",
    "",
    "3. Municipal authorities must remove identified encroachments within 45 days.",
    "",
    "4. The Revenue Department is directed to immediately halt any enforcement action.",
]

for line in text_lines:
    c.drawString(0.5 * inch, y, line)
    y -= 0.25 * inch

c.save()
print(f"✓ Created test PDF: {output_path}")
