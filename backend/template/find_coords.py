import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def draw_overlay():
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica", 8)
    
    # Let's draw an X,Y grid overlay to easily find coordinates
    # Letter size is 8.5 x 11 inches. 
    # 8.5 inches = 612 points.
    # 11 inches = 792 points.
    # To view the structure, I'll print markers at every 50 points.
    for x in range(0, 612, 50):
        for y in range(0, 792, 50):
            c.drawString(x, y, f"{x},{y}")
            
    c.save()
    buffer.seek(0)
    return buffer

with open("overlay.pdf", "wb") as f:
    f.write(draw_overlay().read())
