-- Migración: Añadir columna is_predefined a marketing_templates
ALTER TABLE marketing_templates ADD COLUMN IF NOT EXISTS is_predefined BOOLEAN DEFAULT false;

-- Limpiar plantillas predefinidas antiguas para evitar duplicados en pruebas
DELETE FROM marketing_templates WHERE is_predefined = true;

-- Insertar nuevas plantillas predefinidas usando UUIDs válidos
INSERT INTO marketing_templates (id, nombre, descripcion, categoria, formato, thumbnail_url, html_content, is_predefined)
VALUES 
-- 1. FLYER A4 VERTICAL PREMIUM
(
  '858c734b-4b1d-44a6-988c-7f511746c0a4',
  'Flyer A4 - Elegancia Vertical',
  'Diseño corporativo ideal para escaparates y buzoneo premium. Incluye cabecera con logo y pie de página de contacto.',
  'fisico',
  'A4',
  '',
  '[
    {"id":"bg","type":"shape","x":0,"y":0,"width":800,"height":1131,"color":"#ffffff","zIndex":0},
    {"id":"header","type":"shape","x":0,"y":0,"width":800,"height":120,"color":"{{BRAND_PRIMARY}}","zIndex":1},
    {"id":"logo","type":"image","x":40,"y":30,"width":180,"height":60,"content":"{{BRAND_LOGO}}","zIndex":2},
    {"id":"main-img","type":"image","x":40,"y":140,"width":720,"height":500,"content":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800","zIndex":1},
    {"id":"price-tag","type":"shape","x":500,"y":600,"width":260,"height":80,"color":"{{BRAND_SECONDARY}}","zIndex":3},
    {"id":"price-text","type":"text","x":520,"y":615,"content":"350.000 €","fontSize":"32px","color":"#ffffff","fontWeight":"bold","zIndex":4},
    {"id":"title","type":"text","x":40,"y":680,"content":"{{BRAND_NAME}} - Propiedad Exclusiva","fontSize":"28px","color":"#1a1a1a","fontWeight":"bold","zIndex":1},
    {"id":"details","type":"text","x":40,"y":730,"content":"3 Hab | 2 Baños | 120 m²\\nUbicación privilegiada con vistas al mar.","fontSize":"18px","color":"#666666","zIndex":1},
    {"id":"footer-bar","type":"shape","x":0,"y":1031,"width":800,"height":100,"color":"{{BRAND_PRIMARY}}","zIndex":1},
    {"id":"footer-text","type":"text","x":40,"y":1055,"content":"{{BRAND_WEB}} | {{BRAND_PHONE}} | {{BRAND_EMAIL}}","fontSize":"16px","color":"#1a1a1a","fontWeight":"bold","zIndex":2}
  ]',
  true
),

-- 2. TARJETA DE VISITA CORPORATIVA
(
  '37f59d43-982c-473d-9d41-37f28d7a1234',
  'Tarjeta de Visita - Minimalist',
  'Tarjeta de visita limpia y moderna que resalta el logo y la marca secundaria.',
  'fisico',
  'Tarjeta',
  '',
  '[
    {"id":"bg","type":"shape","x":0,"y":0,"width":320,"height":200,"color":"{{BRAND_SECONDARY}}","zIndex":0},
    {"id":"logo","type":"image","x":60,"y":50,"width":200,"height":100,"content":"{{BRAND_LOGO}}","zIndex":1},
    {"id":"web","type":"text","x":0,"y":160,"content":"{{BRAND_WEB}}","fontSize":"12px","color":"#ffffff","fontWeight":"bold","zIndex":1}
  ]',
  true
),

-- 3. INSTAGRAM POST - LUXURY
(
  'a4f8d923-3b2c-411a-8c9d-123456789abc',
  'Instagram Post - Luxury Dark',
  'Publicación cuadrada optimizada para Instagram. Fondo oscuro con acentos en el color primario.',
  'social',
  'Instagram',
  '',
  '[
    {"id":"bg","type":"shape","x":0,"y":0,"width":800,"height":800,"color":"#1a1a1a","zIndex":0},
    {"id":"img","type":"image","x":40,"y":40,"width":720,"height":480,"content":"https://images.unsplash.com/photo-1600607687940-4e5273561c29?q=80&w=800","zIndex":1},
    {"id":"accent","type":"shape","x":40,"y":540,"width":100,"height":4,"color":"{{BRAND_PRIMARY}}","zIndex":2},
    {"id":"title","type":"text","x":40,"y":560,"content":"NUEVA CAPTACIÓN","fontSize":"42px","color":"#ffffff","fontWeight":"bold","zIndex":1},
    {"id":"price","type":"text","x":40,"y":620,"content":"Desde 275.000 €","fontSize":"24px","color":"{{BRAND_PRIMARY}}","fontWeight":"bold","zIndex":1},
    {"id":"logo","type":"image","x":620,"y":700,"width":140,"height":60,"content":"{{BRAND_LOGO}}","zIndex":2},
    {"id":"footer","type":"text","x":40,"y":720,"content":"{{BRAND_NAME}} | {{BRAND_WEB}}","fontSize":"14px","color":"#888888","zIndex":1}
  ]',
  true
),

-- 4. FACEBOOK AD - AGENTE
(
  'b2c1d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  'Facebook Ad - Conoce al Agente',
  'Anuncio horizontal para Facebook diseñado para generar confianza y mostrar el equipo.',
  'social',
  'Facebook',
  '',
  '[
    {"id":"bg","type":"shape","x":0,"y":0,"width":1200,"height":630,"color":"#f8fafc","zIndex":0},
    {"id":"side-color","type":"shape","x":0,"y":0,"width":400,"height":630,"color":"{{BRAND_PRIMARY}}","zIndex":1},
    {"id":"agent-img","type":"image","x":50,"y":100,"width":300,"height":300,"content":"https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400","zIndex":2},
    {"id":"quote","type":"text","x":450,"y":150,"content":"\\\"Vender tu casa nunca fue tan fácil.\\\"","fontSize":"48px","color":"#1e293b","fontWeight":"bold","zIndex":1},
    {"id":"sub","type":"text","x":450,"y":300,"content":"Confía en los expertos de {{BRAND_NAME}}.","fontSize":"24px","color":"#64748b","zIndex":1},
    {"id":"cta-bg","type":"shape","x":450,"y":450,"width":300,"height":60,"color":"{{BRAND_SECONDARY}}","zIndex":1},
    {"id":"cta-text","type":"text","x":490,"y":465,"content":"CONTÁCTANOS","fontSize":"20px","color":"#ffffff","fontWeight":"bold","zIndex":2},
    {"id":"logo","type":"image","x":950,"y":520,"width":200,"height":80,"content":"{{BRAND_LOGO}}","zIndex":2}
  ]',
  true
),

-- 5. INSTAGRAM STORY - VENDIDO
(
  'e5f4d3c2-b1a0-4f9e-8d7c-6b5a4a3a2a1a',
  'IG Story - ¡Vendido!',
  'Historia vertical de alto impacto para celebrar ventas exitosas.',
  'social',
  'Instagram Story',
  '',
  '[
    {"id":"bg","type":"shape","x":0,"y":0,"width":1080,"height":1920,"color":"{{BRAND_PRIMARY}}","zIndex":0},
    {"id":"img","type":"image","x":0,"y":0,"width":1080,"height":1200,"content":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800","zIndex":1},
    {"id":"overlay","type":"shape","x":0,"y":1000,"width":1080,"height":200,"color":"rgba(0,0,0,0.6)","zIndex":2},
    {"id":"sold-text","type":"text","x":0,"y":1050,"content":"¡VENDIDO!","fontSize":"120px","color":"#ffffff","fontWeight":"900","zIndex":3},
    {"id":"info-bg","type":"shape","x":0,"y":1200,"width":1080,"height":720,"color":"#ffffff","zIndex":1},
    {"id":"logo","type":"image","x":390,"y":1250,"width":300,"height":150,"content":"{{BRAND_LOGO}}","zIndex":2},
    {"id":"congrats","type":"text","x":0,"y":1450,"content":"Otra familia feliz gracias a\\n{{BRAND_NAME}}","fontSize":"40px","color":"#1a1a1a","fontWeight":"bold","zIndex":2},
    {"id":"web","type":"text","x":0,"y":1750,"content":"{{BRAND_WEB}}","fontSize":"32px","color":"{{BRAND_PRIMARY}}","fontWeight":"bold","zIndex":2}
  ]',
  true
);
