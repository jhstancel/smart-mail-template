# app/intents_registry.py
# Single source of truth for names/labels/descriptions.
INTENTS_META = [
    {
        "name": "quote_request",
        "label": "Quote Request",
        "description": "Ask for pricing and lead time.",
    },
    {
        "name": "shipment_update",
        "label": "Shipment Update",
        "description": "Send tracking, carrier, or ship date.",
    },
    {
        "name": "order_confirmation",
        "label": "Order Confirmation",
        "description": "Acknowledge or confirm a PO.",
    },
    {
        "name": "invoice_payment",
        "label": "Invoice / Payment",
        "description": "Payment or invoice notice.",
    },
    {
        "name": "qb_order",
        "label": "QB Order",
        "description": "QuickBooks order request.",
        "order": 65,
        "hidden": False,
    },
    {
        "name": "delay_notice",
        "label": "Delay Notice",
        "description": "Notify a date change or backorder.",
    },
    {
        "name": "packing_slip_docs",
        "label": "Docs / Packing Slip",
        "description": "Send packing slip, COO, SDS.",
    },
    {
        "name": "followup",
        "label": "Follow-Up",
        "description": "Polite nudge or status check.",
    },
    {
        "name": "auto_detect",
        "label": "Auto Detect",
        "description": "Let the system read your draft and suggest an intent.",
    },
    {
        "name": "invoice_po_followup",
        "label": "Invoice/PO Follow-Up",
        "description": "Follow up on invoice/PO status and payment timeline.",
        "order": 75,
        "hidden": False,
    },
    {
        "name": "tax_exemption",
        "label": "Tax-Exempt Certificate",
        "description": "Reply with the tax-exempt certificate attached.",
        "order": 85,
        "hidden": False,
    },
]
