#!/usr/bin/env python3
"""Client-facing PayID integration handoff guide for Jack's Barber Style."""

from fpdf import FPDF
from pathlib import Path

OUTPUT = (
    Path(__file__).resolve().parent
    / "Client-Handoff-PayID-Integration-Guide-Jacks-Barber-Style.pdf"
)


def safe(text):
    if not isinstance(text, str):
        text = str(text)
    return (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .replace("\u2265", ">=")
        .replace("\u2022", "-")
        .replace("\u2610", "[ ]")
        .replace("\u2713", "[x]")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
    )


class ClientGuidePDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(110, 110, 110)
        self.cell(0, 8, safe("Jack's Barber Style - PayID Integration Guide for Client"), align="C")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def cover(self):
        self.add_page()
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(25, 25, 25)
        self.ln(35)
        self.multi_cell(0, 11, safe("PayID Integration Guide"), align="C")
        self.ln(4)
        self.set_font("Helvetica", "B", 16)
        self.multi_cell(0, 9, safe("Jack's Barber Style"), align="C")
        self.ln(10)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(70, 70, 70)
        self.multi_cell(0, 7, safe("What you need to know and what to provide\nso we can go live with PayID payments"), align="C")
        self.ln(14)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 6, safe("Prepared for: Jack (business owner)\nPrepared by: Your website developer\nDate: June 2026"), align="C")
        self.ln(20)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(130, 130, 130)
        self.multi_cell(
            0,
            5,
            safe(
                "Please read this guide, complete the checklist at the end, and send the "
                "requested details back to your developer. This will allow PayID payments "
                "to work correctly on your booking website."
            ),
            align="C",
        )

    def h1(self, text):
        self.ln(3)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(25, 25, 25)
        self.multi_cell(0, 8, safe(text))
        self.ln(2)
        self.set_draw_color(180, 140, 60)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def h2(self, text):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(45, 45, 45)
        self.multi_cell(0, 6, safe(text))
        self.ln(2)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(35, 35, 35)
        self.multi_cell(0, 5.5, safe(text))
        self.ln(2)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.cell(6, 5.5, "-")
        self.multi_cell(0, 5.5, safe(text))
        self.ln(1)

    def numbered(self, n, text):
        self.set_font("Helvetica", "", 10)
        self.cell(8, 5.5, safe(str(n) + "."))
        self.multi_cell(0, 5.5, safe(text))
        self.ln(1)

    def check(self, text):
        self.set_font("Helvetica", "", 10)
        self.cell(10, 5.5, "[ ]")
        self.multi_cell(0, 5.5, safe(text))
        self.ln(1)

    def fill_line(self, label, width=120):
        self.set_font("Helvetica", "", 10)
        self.cell(55, 7, safe(label))
        self.cell(width, 7, safe("___________________________________________"), border="B")
        self.ln(10)

    def highlight_box(self, text):
        self.set_fill_color(255, 249, 235)
        self.set_draw_color(180, 140, 60)
        y = self.get_y()
        self.set_font("Helvetica", "", 10)
        lines = self.multi_cell(0, 5.5, safe(text), dry_run=True, output="LINES")
        h = max(14, len(lines) * 5.5 + 8)
        if y + h > 270:
            self.add_page()
            y = self.get_y()
        self.set_xy(10, y)
        self.rect(10, y, 190, h, style="DF")
        self.set_xy(14, y + 4)
        self.multi_cell(182, 5.5, safe(text))
        self.set_xy(10, y + h + 4)


def build():
    pdf = ClientGuidePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.cover()

    # 1. Introduction
    pdf.add_page()
    pdf.h1("1. Introduction")
    pdf.body(
        "This guide explains how PayID payments will work on your Jack's Barber Style website, "
        "what you need to set up with your bank and accountant, and exactly what information "
        "you must provide to your developer so we can connect everything and go live."
    )
    pdf.body(
        "Your website already supports PayID. Once you supply the details in Section 5, "
        "your developer will add them to the site and clients will be able to pay for bookings "
        "directly from their banking app - no card fees, no Stripe."
    )
    pdf.highlight_box(
        "Your action: Read this guide, complete the checklist in Section 6, fill in Section 5, "
        "and send it back to your developer."
    )

    # 2. How it works
    pdf.h1("2. How PayID will work for your clients")
    pdf.body("When a client books online, this is what happens:")
    pdf.numbered(1, "Client fills in the booking form on your website (service, date, time, contact details).")
    pdf.numbered(2, "They see a payment screen with your PayID, the exact amount, and a unique booking reference.")
    pdf.numbered(3, "Client opens their banking app (CommBank, NAB, Westpac, ANZ, etc.) and sends payment via PayID.")
    pdf.numbered(4, "Money arrives in your business bank account - usually within seconds.")
    pdf.numbered(5, "You confirm the payment (or it confirms automatically if Azupay is set up later).")
    pdf.numbered(6, "Booking is marked Confirmed. You cut their hair at the scheduled time.")
    pdf.body(
        "Important: The client must pay the exact amount shown and use the booking reference "
        "so you can match the payment to their appointment."
    )

    # 3. What you need to do
    pdf.add_page()
    pdf.h1("3. What you need to do (before we go live)")
    pdf.h2("A. Set up PayID with your bank")
    pdf.body("Use your business bank account - not a personal account.")
    pdf.numbered(1, "Log in to your business bank app or internet banking.")
    pdf.numbered(2, "Find PayID settings (sometimes under 'Payments' or 'Pay Anyone').")
    pdf.numbered(3, "Create a PayID using ONE of these (your choice):")
    pdf.bullet("Your mobile number: 0478 268 399")
    pdf.bullet("Your business email: Jacqueskatumbulu@gmail.com")
    pdf.bullet("Your ABN (recommended once GST registered)")
    pdf.numbered(4, "Link the PayID to your business transaction account.")
    pdf.numbered(5, "Write down the exact business name that appears when someone looks up your PayID.")
    pdf.body(
        "Tip: PayID registration is free and usually takes a few minutes. If unsure, ask your bank "
        "for help setting up PayID on a business account."
    )

    pdf.h2("B. Confirm GST with your accountant (recommended)")
    pdf.body(
        "Barber services are usually taxable in Australia. If your turnover is $75,000 or more "
        "in a 12-month period, you must register for GST. Even below that, you may choose to register."
    )
    pdf.bullet("Ask your accountant: Am I registered for GST, or do I need to register?")
    pdf.bullet("Ask: Should my website prices include GST? (Most barber shops show GST-inclusive prices.)")
    pdf.bullet("Get your ABN if you do not have one yet (abr.gov.au).")
    pdf.body(
        "Your developer needs your ABN and GST status to show correct amounts on payment receipts."
    )

    pdf.h2("C. Do NOT use Stripe or card payments")
    pdf.body(
        "This website uses PayID only. You do not need a Stripe account, PayPal, or any card "
        "payment provider. Payments go straight to your bank."
    )

    # 4. Optional Azupay
    pdf.h1("4. Optional: Automatic payment confirmation (Azupay)")
    pdf.body(
        "By default, when a client pays via PayID, you check your bank app and mark the booking "
        "as paid in your Staff admin area. This works fine for most small businesses."
    )
    pdf.body(
        "If you want payments to confirm automatically (no manual checking), you can sign up "
        "with Azupay (azupay.com.au) - an Australian PayID provider. This is optional and can "
        "be added later. Your developer will need Azupay API credentials if you choose this."
    )
    pdf.bullet("Phase 1 (now): Static PayID - you confirm payments manually in Staff admin")
    pdf.bullet("Phase 2 (optional later): Azupay - website confirms payments automatically")

    # 5. Information to supply
    pdf.add_page()
    pdf.h1("5. Information to supply to your developer")
    pdf.body(
        "Please fill in every field below and send this page (or a clear list) back to your developer. "
        "We cannot go live with PayID until we have these details."
    )
    pdf.ln(2)
    pdf.h2("Required - must have before go-live")
    pdf.fill_line("Business / trading name:")
    pdf.fill_line("PayID (mobile, email, or ABN):")
    pdf.fill_line("Name shown in bank app when PayID is looked up:")
    pdf.fill_line("Business email for receipts:")
    pdf.fill_line("Business phone:")
    pdf.fill_line("Website URL (if different from jack-barber-rho.vercel.app):")

    pdf.h2("GST and tax (from your accountant)")
    pdf.fill_line("ABN:")
    pdf.body("Are you registered for GST?   [ ] Yes   [ ] No   [ ] Not sure yet")
    pdf.body("Should prices on the website include GST?   [ ] Yes   [ ] No")
    pdf.fill_line("Accountant name / contact (optional):")

    pdf.h2("Bank details (for receipts - optional on website)")
    pdf.body("Clients pay via PayID. BSB and account number are optional backup for receipts only.")
    pdf.fill_line("Bank name:")
    pdf.fill_line("Account name:")
    pdf.fill_line("BSB:")
    pdf.fill_line("Account number:")

    pdf.h2("Optional - for automatic confirmation later")
    pdf.fill_line("Azupay account email (if signed up):")
    pdf.body("Using Azupay for auto-confirm?   [ ] Not now   [ ] Yes, I have credentials")

    # 6. Checklist
    pdf.add_page()
    pdf.h1("6. Your checklist before go-live")
    pdf.body("Tick each item when done, then send this to your developer.")
    pdf.ln(2)
    pdf.check("I have read and understand how PayID works on my website")
    pdf.check("PayID is registered on my BUSINESS bank account (not personal)")
    pdf.check("I know which PayID I am using (mobile, email, or ABN)")
    pdf.check("I have confirmed the business name that shows in the banking app")
    pdf.check("I have spoken to my accountant about GST (or confirmed I am not GST registered)")
    pdf.check("I have filled in Section 5 and sent all details to my developer")
    pdf.check("I understand I must match booking references to bank deposits when confirming payment")
    pdf.check("I have tested a booking on the website after developer says it is live")
    pdf.check("I know how to mark a booking as Paid in Staff admin (admin area on website)")

    pdf.h2("What your developer will do once you supply the details")
    pdf.bullet("Add your PayID and business details to the website hosting (Vercel)")
    pdf.bullet("Turn on PayID payment instructions on the booking form")
    pdf.bullet("Configure GST display if you are GST registered")
    pdf.bullet("Test a booking end-to-end")
    pdf.bullet("Notify you when the site is ready for real client payments")
    pdf.bullet("Remove any old Stripe settings if they exist")

    # 7. After go-live
    pdf.h1("7. After go-live - your daily process")
    pdf.body("Until automatic confirmation is set up (if ever), follow this each day:")
    pdf.numbered(1, "Client books online and receives PayID payment instructions.")
    pdf.numbered(2, "Check your bank app for incoming PayID payments.")
    pdf.numbered(3, "Match the payment reference (e.g. b1719567890) to the booking in Staff admin.")
    pdf.numbered(4, "Mark the booking as Paid / Confirmed.")
    pdf.numbered(5, "Send the client a tax invoice or receipt if required (ask your accountant).")
    pdf.body(
        "Keep records of all payments for at least 5 years. Your Staff Finances area tracks "
        "income for you. Export or screenshot for your accountant at BAS time."
    )

    # 8. FAQ
    pdf.add_page()
    pdf.h1("8. Frequently asked questions")
    pdf.h2("Do I need Stripe?")
    pdf.body("No. This website uses PayID only. No card processing.")
    pdf.h2("How much does PayID cost?")
    pdf.body(
        "PayID bank transfers are usually free for receiving money. Check with your bank. "
        "There are no percentage fees like credit cards."
    )
    pdf.h2("What if a client pays the wrong amount?")
    pdf.body(
        "Contact the client and ask them to pay the difference, or refund via bank transfer "
        "and ask them to pay again with the correct amount and reference."
    )
    pdf.h2("What if a client forgets the booking reference?")
    pdf.body(
        "Check the amount and their name in your bank feed, then find their booking in Staff "
        "admin by name, date, or email."
    )
    pdf.h2("Can clients still pay cash in the shop?")
    pdf.body(
        "Yes. Online bookings expect PayID payment in advance. Walk-in cash clients are separate - "
        "record those in Staff Finances manually."
    )
    pdf.h2("Who do I contact for help?")
    pdf.body(
        "Website / PayID setup issues: your developer\n"
        "Tax / GST questions: your accountant\n"
        "Bank / PayID registration: your bank"
    )

    # 9. Contact return
    pdf.h1("9. Return this to your developer")
    pdf.body("Send completed Section 5 and Section 6 checklist to:")
    pdf.fill_line("Developer name / email:")
    pdf.ln(4)
    pdf.body(
        "Once received, your developer will configure the site and confirm when PayID is live. "
        "Typical turnaround: 1-2 business days after all required details are supplied."
    )

    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(
        0,
        5,
        safe(
            "Jack's Barber Style - 47 O'Meara Street, Wodonga VIC 3690\n"
            "PayID Integration Client Guide - June 2026"
        ),
        align="C",
    )

    pdf.output(str(OUTPUT))
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build()
