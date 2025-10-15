# AUTO-GENERATED FILE — DO NOT EDIT.
SCHEMA_GENERATED = {
  "quote_request": {
    "description": "Customer requests pricing and availability for an item.",
    "fieldTypes": {
      "companyName": "string",
      "contactPerson": "string",
      "deliveryDate": "date",
      "destination": "string",
      "item": "string",
      "notes": "longtext",
      "quantity": "string"
    },
    "hints": {
      "companyName": "e.g., UP Aviation LLC",
      "contactPerson": "e.g., John Stancel",
      "deliveryDate": "mm/dd/yyyy",
      "destination": "e.g., Asheville NC or zip code",
      "item": "e.g., PN-10423 or \u201cpressure sensor kit\u201d",
      "notes": "Any special instructions",
      "quantity": "e.g., 2"
    },
    "label": "Quote Request",
    "optional": [
      "deliveryDate",
      "contactPerson",
      "notes"
    ],
    "required": [
      "companyName",
      "item",
      "quantity",
      "destination"
    ]
  },
  "shipment_update": {
    "description": "Notify a customer about shipment/tracking status.",
    "fieldTypes": {
      "carrier": "enum",
      "estimatedArrival": "date",
      "notes": "longtext",
      "orderNumber": "string",
      "shipDate": "date",
      "trackingNumber": "string"
    },
    "hints": {
      "carrier": "Choose from UPS, FedEx, DHL, USPS",
      "estimatedArrival": "mm/dd/yyyy",
      "orderNumber": "Optional, if available",
      "shipDate": "mm/dd/yyyy",
      "trackingNumber": "e.g., 1Z999AA10123456784"
    },
    "label": "Shipment Update",
    "optional": [
      "estimatedArrival",
      "orderNumber",
      "notes"
    ],
    "required": [
      "trackingNumber",
      "carrier",
      "shipDate"
    ]
  }
}
