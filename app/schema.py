# app/schema.py
"""
Defines required and optional fields for each intent.
Used by /generate endpoint and merged into /intents responses.
"""

SCHEMA = {
    "quote_request": {
        "required": ["companyName", "item", "quantity", "destination"],
        "optional": ["deliveryDate", "contactPerson", "notes"],
    },
    "shipment_update": {
        "required": ["trackingNumber", "carrier", "shipDate"],
        "optional": ["estimatedArrival", "orderNumber", "notes"],
    },
    "qb_order": {
        "label": "QB Order",
        "description": "QuickBooks order request.",
        "required": ["recipientName"],
        "optional": [],
    },
    "order_confirmation": {
        "required": ["orderNumber", "companyName", "deliveryDate"],
        "optional": ["items", "trackingNumber", "notes"],
    },
    "invoice_payment": {
        "required": ["invoiceNumber", "amount", "paymentDate"],
        "optional": ["method", "notes"],
    },
    "delay_notice": {
        "required": ["reason"],
        "optional": ["previousShip", "newShip", "recipientName", "poNumber", "partNumber"],
    },
    "packing_slip_docs": {
        "required": ["documentType", "orderNumber"],
        "optional": ["attachment", "notes"],
    },
    "followup": {
        "required": ["topic", "recipientName"],
        "optional": ["previousDate", "notes"],
    },
    # Auto detect pseudo-intent (no fields; handled in main.py)
    "auto_detect": {
        "required": [],
    },
    "invoice_po_followup": {
        "required": ["recipientName", "invoiceNumber", "poNumber", "dueDate"],
    },
    "tax_exemption": {
        "required": ["recipientName"],
    },
    "order_request": {
    "label": "Order Request",
    "description": "Request to process and confirm an order with shipping details.",
    "required": ["recipientName", "parts", "fedexAccount", "shipAddress"],
    }

}

# Merge optional fields into required for all intents
for name, data in SCHEMA.items():
    req = set(data.get("required", []))
    opt = set(data.get("optional", []))
    data["required"] = sorted(req | opt)  # union of both
    data["optional"] = []  # clear optional list

# Optional: for reference or validation
INTENT_NAMES = list(SCHEMA.keys())
