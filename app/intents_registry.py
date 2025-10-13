# app/intents_registry.py
"""
Single source of truth for intent names and human-friendly descriptions.
Do not put required fields here; those live in app/schema.py (SCHEMA[intent]["required"]).
"""

INTENTS_META = [
    {
        "name": "FollowUpReply",
        "label": "Follow-Up Reply",
        "description": "Polite follow-up reply to a previous email thread.",
    },
    {
        "name": "TrackingUpdate",
        "label": "Tracking Update",
        "description": "Share tracking information or request a tracking status.",
    },
    {
        "name": "PORequest",
        "label": "PO Request",
        "description": "Request a purchase order (PO) or send a PO to a vendor.",
    },
    {
        "name": "QuoteRequest",
        "label": "Quote Request",
        "description": "Request a freight/shipping quote with key shipment details.",
    },
    {
        "name": "OrderConfirmation",
        "label": "Order Confirmation",
        "description": "Confirm an order has been received and is being processed.",
    },
    {
        "name": "Scheduling",
        "label": "Scheduling",
        "description": "Propose or confirm pickup/delivery dates and time windows.",
    },
]

