import os
from pypdf import PdfReader, PdfWriter

def merge():
    reader_base = PdfReader("DTR_Template.pdf")
    reader_overlay = PdfReader("overlay.pdf")
    
    writer = PdfWriter()
    
    page = reader_base.pages[0]
    overlay_page = reader_overlay.pages[0]
    
    page.merge_page(overlay_page)
    writer.add_page(page)
    
    with open("merged.pdf", "wb") as fp:
        writer.write(fp)
        
merge()
