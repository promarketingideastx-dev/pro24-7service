export const TAXONOMY = {
    // =========================================
    // PILAR 1: ARTE Y DISEÑO
    // =========================================
    'art_design': {
        id: 'art_design',
        label: { es: 'Arte y Diseño', en: 'Art & Design', pt: 'Arte e Design' },
        subcategories: [
            {
                id: 'photography',
                label: { es: 'Fotografía', en: 'Photography', pt: 'Fotografia' },
                specialties: [
                    { es: 'Retrato / Sesión personal', en: 'Portrait / Personal Session', pt: 'Retrato / Sessão pessoal' },
                    { es: 'Fotografía de eventos', en: 'Event Photography', pt: 'Fotografia de eventos' },
                    { es: 'Fotografía de producto (e-commerce)', en: 'Product Photography (e-commerce)', pt: 'Fotografia de produto (e-commerce)' },
                    { es: 'Fotografía gastronómica', en: 'Food Photography', pt: 'Fotografia gastronômica' },
                    { es: 'Fotografía inmobiliaria / arquitectura', en: 'Real Estate / Architecture Photography', pt: 'Fotografia imobiliária / arquitetura' },
                    { es: 'Fotografía corporativa', en: 'Corporate Photography', pt: 'Fotografia corporativa' },
                    { es: 'Fotografía familiar / niños', en: 'Family / Children Photography', pt: 'Fotografia familiar / crianças' },
                    { es: 'Fotografía de bodas', en: 'Wedding Photography', pt: 'Fotografia de casamento' },
                    { es: 'Fotografía con dron', en: 'Drone Photography', pt: 'Fotografia com drone' },
                ]
            },
            {
                id: 'videography',
                label: { es: 'Videografía', en: 'Videography', pt: 'Videografia' },
                specialties: [
                    { es: 'Video para eventos', en: 'Event Video', pt: 'Vídeo para eventos' },
                    { es: 'Video corporativo', en: 'Corporate Video', pt: 'Vídeo corporativo' },
                    { es: 'Video para redes (Reels/TikTok)', en: 'Social Media Video (Reels/TikTok)', pt: 'Vídeo para redes sociais (Reels/TikTok)' },
                    { es: 'Video publicitario / comercial', en: 'Advertising / Commercial Video', pt: 'Vídeo publicitário / comercial' },
                    { es: 'Video inmobiliario', en: 'Real Estate Video', pt: 'Vídeo imobiliário' },
                    { es: 'Videoclips musicales', en: 'Music Videos', pt: 'Videoclipes musicais' },
                    { es: 'Grabación con dron', en: 'Drone Recording', pt: 'Gravação com drone' },
                    { es: 'Streaming / cobertura en vivo', en: 'Streaming / Live Coverage', pt: 'Streaming / cobertura ao vivo' },
                ]
            },
            {
                id: 'editing',
                label: { es: 'Edición (Foto/Video)', en: 'Editing', pt: 'Edição' },
                specialties: [
                    { es: 'Edición de video (cortes + narrativa)', en: 'Video Editing (cuts + narrative)', pt: 'Edição de vídeo (cortes + narrativa)' },
                    { es: 'Colorización / color grading', en: 'Colorization / Color Grading', pt: 'Colorização / color grading' },
                    { es: 'Motion graphics / animación básica', en: 'Motion Graphics / Basic Animation', pt: 'Motion graphics / animação básica' },
                    { es: 'Subtítulos (multi-idioma)', en: 'Subtitles (multi-language)', pt: 'Legendas (multi-idioma)' },
                    { es: 'Edición para Reels/TikTok', en: 'Editing for Reels/TikTok', pt: 'Edição para Reels/TikTok' },
                    { es: 'Restauración de fotos', en: 'Photo Restoration', pt: 'Restauração de fotos' },
                    { es: 'Retoque profesional (piel, limpieza)', en: 'Professional Retouching (skin, cleanup)', pt: 'Retoque profissional (pele, limpeza)' },
                    { es: 'Fotomontaje / composición', en: 'Photomontage / Composition', pt: 'Fotomontagem / composição' },
                    { es: 'Optimización para redes (formatos)', en: 'Social Media Optimization (formats)', pt: 'Otimização para redes sociais (formatos)' },
                ]
            },
            {
                id: 'graphic_design',
                label: { es: 'Diseño Gráfico', en: 'Graphic Design', pt: 'Design Gráfico' },
                specialties: [
                    { es: 'Logos / branding', en: 'Logos / Branding', pt: 'Logos / branding' },
                    { es: 'Flyers / posters', en: 'Flyers / Posters', pt: 'Flyers / pôsters' },
                    { es: 'Artes para redes sociales', en: 'Social Media Graphics', pt: 'Artes para redes sociais' },
                    { es: 'Menús (diseño)', en: 'Menus (design)', pt: 'Cardápios (design)' },
                    { es: 'Presentaciones (pitch/empresa)', en: 'Presentations (pitch/company)', pt: 'Apresentações (pitch/empresa)' },
                    { es: 'Identidad visual completa', en: 'Complete Visual Identity', pt: 'Identidade visual completa' },
                    { es: 'Diseño para impresión (tarjetas, banners)', en: 'Print Design (cards, banners)', pt: 'Design para impressão (cartões, banners)' },
                    { es: 'Packaging / etiquetas', en: 'Packaging / Labels', pt: 'Embalagens / etiquetas' },
                    { es: 'Mockups de producto', en: 'Product Mockups', pt: 'Mockups de produto' },
                ]
            },
            {
                id: 'music',
                label: { es: 'Música', en: 'Music', pt: 'Música' },
                specialties: [
                    { es: 'DJ (eventos)', en: 'DJ (events)', pt: 'DJ (eventos)' },
                    { es: 'Producción musical', en: 'Music Production', pt: 'Produção musical' },
                    { es: 'Mezcla y masterización', en: 'Mixing & Mastering', pt: 'Mixagem e masterização' },
                    { es: 'Grabación de voz', en: 'Voice Recording', pt: 'Gravação de voz' },
                    { es: 'Beats / instrumentales', en: 'Beats / Instrumentals', pt: 'Beats / instrumentais' },
                    { es: 'Música para videos (jingles/intro)', en: 'Music for Videos (jingles/intro)', pt: 'Música para vídeos (jingles/intro)' },
                    { es: 'Sonido en vivo (setup básico)', en: 'Live Sound (basic setup)', pt: 'Som ao vivo (setup básico)' },
                ]
            },
            {
                id: 'dance',
                label: { es: 'Baile', en: 'Dance', pt: 'Dança' },
                specialties: [
                    { es: 'Clases (individual/grupal)', en: 'Classes (individual/group)', pt: 'Aulas (individual/grupo)' },
                    { es: 'Coreografías para eventos', en: 'Choreographies for Events', pt: 'Coreografias para eventos' },
                    { es: 'Baile urbano', en: 'Urban Dance', pt: 'Dança urbana' },
                    { es: 'Salsa / bachata / merengue', en: 'Salsa / Bachata / Merengue', pt: 'Salsa / bachata / merengue' },
                    { es: 'Folklor / tradicional', en: 'Folk / Traditional', pt: 'Folclore / tradicional' },
                    { es: 'K-Pop / moderno', en: 'K-Pop / Modern', pt: 'K-Pop / moderno' },
                    { es: 'Pole Dance', en: 'Pole Dance', pt: 'Pole Dance' },
                ]
            },
            {
                id: 'crafts',
                label: { es: 'Manualidades', en: 'Crafts', pt: 'Artesanato' },
                specialties: [
                    { es: 'Decoración artesanal', en: 'Handmade Decoration', pt: 'Decoração artesanal' },
                    { es: 'Personalizados (tazas, camisetas, regalos)', en: 'Personalized items (mugs, shirts, gifts)', pt: 'Personalizados (canecas, camisetas, presentes)' },
                    { es: 'Arreglos/centros de mesa', en: 'Flower Arrangements / Centerpieces', pt: 'Arranjos / centros de mesa' },
                    { es: 'Piñatas / decoraciones', en: 'Piñatas / Decorations', pt: 'Piñatas / decorações' },
                    { es: 'Bisutería / accesorios', en: 'Jewelry / Accessories', pt: 'Bijuteria / acessórios' },
                    { es: 'Detalles para eventos', en: 'Event Details', pt: 'Lembranças para eventos' },
                ]
            },
            {
                id: 'self_defense',
                label: { es: 'Defensa Personal', en: 'Self Defense', pt: 'Defesa Pessoal' },
                specialties: [
                    { es: 'Artes marciales (general)', en: 'Martial Arts (general)', pt: 'Artes marciais (geral)' },
                    { es: 'Karate', en: 'Karate', pt: 'Karatê' },
                    { es: 'Taekwondo', en: 'Taekwondo', pt: 'Taekwondo' },
                    { es: 'Jiu-Jitsu / MMA', en: 'Jiu-Jitsu / MMA', pt: 'Jiu-Jitsu / MMA' },
                    { es: 'Boxeo', en: 'Boxing', pt: 'Boxe' },
                    { es: 'Kickboxing', en: 'Kickboxing', pt: 'Kickboxing' },
                    { es: 'Yoga', en: 'Yoga', pt: 'Yoga' },
                    { es: 'Defensa personal para mujeres', en: 'Self Defense for Women', pt: 'Defesa pessoal para mulheres' },
                ]
            },
            {
                id: 'digital_marketing',
                label: { es: 'Marketing Digital', en: 'Digital Marketing', pt: 'Marketing Digital' },
                specialties: [
                    { es: 'Desarrollo de apps móviles', en: 'Mobile App Development', pt: 'Desenvolvimento de apps móveis' },
                    { es: 'Desarrollo de sitios web', en: 'Website Development', pt: 'Desenvolvimento de sites' },
                    { es: 'Gestión de redes sociales', en: 'Social Media Management', pt: 'Gestão de redes sociais' },
                    { es: 'Publicidad pagada (Meta Ads / Google Ads)', en: 'Paid Advertising (Meta Ads / Google Ads)', pt: 'Publicidade paga (Meta Ads / Google Ads)' },
                    { es: 'SEO / Posicionamiento web', en: 'SEO / Search Engine Optimization', pt: 'SEO / Posicionamento na web' },
                    { es: 'Email marketing y automatizaciones', en: 'Email Marketing & Automations', pt: 'E-mail marketing e automações' },
                    { es: 'Estrategia de contenido', en: 'Content Strategy', pt: 'Estratégia de conteúdo' },
                    { es: 'Análisis y métricas (reportes digitales)', en: 'Analytics & Metrics (digital reports)', pt: 'Análise e métricas (relatórios digitais)' },
                    { es: 'Diseño y optimización de landing pages', en: 'Landing Page Design & Optimization', pt: 'Design e otimização de landing pages' },
                    { es: 'Branding digital / identidad de marca online', en: 'Digital Branding / Online Brand Identity', pt: 'Branding digital / identidade de marca online' },
                ]
            }

        ]
    },

    // =========================================
    // PILAR 2: SERVICIOS GENERALES
    // =========================================
    'general_services': {
        id: 'general_services',
        label: { es: 'Servicios Generales', en: 'General Services', pt: 'Serviços Gerais' },
        subcategories: [
            {
                id: 'cleaning',
                label: { es: 'Limpieza', en: 'Cleaning', pt: 'Limpeza' },
                specialties: [
                    { es: 'Limpieza de Hogar', en: 'Home Cleaning', pt: 'Limpeza Residencial' },
                    { es: 'Limpieza de Oficinas', en: 'Office Cleaning', pt: 'Limpeza de Escritórios' },
                    { es: 'Limpieza Post-obra', en: 'Post-construction Cleaning', pt: 'Limpeza Pós-obra' },
                    { es: 'Lavado de Vehículos', en: 'Car Wash', pt: 'Lavagem de Veículos' },
                ]
            },
            {
                id: 'handyman',
                label: { es: 'Handyman / Montaje', en: 'Handyman', pt: 'Marido de Aluguel' },
                specialties: [
                    { es: 'Montaje de muebles', en: 'Furniture Assembly', pt: 'Montagem de móveis' },
                    { es: 'Reparaciones menores', en: 'Minor Repairs', pt: 'Reparos menores' },
                    { es: 'Instalación de cuadros/TV', en: 'Picture / TV Installation', pt: 'Instalação de quadros/TV' },
                    { es: 'Cortinas/Persianas', en: 'Curtains / Blinds', pt: 'Cortinas/Persianas' },
                ]
            },
            {
                id: 'plumbing',
                label: { es: 'Plomería', en: 'Plumbing', pt: 'Encanamento' },
                specialties: [
                    { es: 'Fugas de agua', en: 'Water Leaks', pt: 'Vazamentos de água' },
                    { es: 'Instalación de grifos', en: 'Faucet Installation', pt: 'Instalação de torneiras' },
                    { es: 'Destape de drenajes', en: 'Drain Unclogging', pt: 'Desentupimento de ralos' },
                    { es: 'Reparación de inodoros', en: 'Toilet Repair', pt: 'Reparo de vasos sanitários' },
                    { es: 'Bombas de agua', en: 'Water Pumps', pt: 'Bombas d\'água' },
                ]
            },
            {
                id: 'electrical',
                label: { es: 'Electricidad', en: 'Electrical', pt: 'Elétrica' },
                specialties: [
                    { es: 'Instalación de lámparas', en: 'Lamp Installation', pt: 'Instalação de lâmpadas' },
                    { es: 'Reparación de cortocircuitos', en: 'Short Circuit Repair', pt: 'Reparo de curto-circuitos' },
                    { es: 'Cambio de tomacorrientes', en: 'Outlet Replacement', pt: 'Troca de tomadas' },
                    { es: 'Cableado estructurado', en: 'Structured Wiring', pt: 'Cabeamento estruturado' },
                ]
            },
            {
                id: 'painting',
                label: { es: 'Pintura', en: 'Painting', pt: 'Pintura' },
                specialties: [
                    { es: 'Pintura de interiores', en: 'Interior Painting', pt: 'Pintura de interiores' },
                    { es: 'Pintura de exteriores', en: 'Exterior Painting', pt: 'Pintura de exteriores' },
                    { es: 'Impermeabilización', en: 'Waterproofing', pt: 'Impermeabilização' },
                    { es: 'Resanado de paredes', en: 'Wall Patching', pt: 'Restauração de paredes' },
                ]
            },
            {
                id: 'hvac',
                label: { es: 'Clima / Aire Acond.', en: 'HVAC', pt: 'Ar Condicionado' },
                specialties: [
                    { es: 'Instalación A/C', en: 'A/C Installation', pt: 'Instalação de A/C' },
                    { es: 'Mantenimiento preventivo', en: 'Preventive Maintenance', pt: 'Manutenção preventiva' },
                    { es: 'Reparación y carga de gas', en: 'Repair & Gas Recharge', pt: 'Reparo e recarga de gás' },
                    { es: 'Ventilación', en: 'Ventilation', pt: 'Ventilação' },
                ]
            },
            {
                id: 'gardening',
                label: { es: 'Jardinería', en: 'Gardening', pt: 'Jardinagem' },
                specialties: [
                    { es: 'Corte de césped', en: 'Lawn Mowing', pt: 'Corte de grama' },
                    { es: 'Poda de árboles', en: 'Tree Pruning', pt: 'Poda de árvores' },
                    { es: 'Diseño de jardines', en: 'Garden Design', pt: 'Design de jardins' },
                    { es: 'Fumigación', en: 'Fumigation', pt: 'Fumigação' },
                ]
            },
            {
                id: 'locksmith',
                label: { es: 'Cerrajería', en: 'Locksmith', pt: 'Chaveiro' },
                specialties: [
                    { es: 'Apertura de puertas', en: 'Door Opening', pt: 'Abertura de portas' },
                    { es: 'Cambio de chapas', en: 'Lock Replacement', pt: 'Troca de fechaduras' },
                    { es: 'Cerrajería automotriz', en: 'Automotive Locksmith', pt: 'Chaveiro automotivo' },
                    { es: 'Duplicados', en: 'Key Duplication', pt: 'Cópias de chaves' },
                ]
            },
            {
                id: 'moving',
                label: { es: 'Mudanzas', en: 'Moving', pt: 'Mudanças' },
                specialties: [
                    { es: 'Fletes locales', en: 'Local Freight', pt: 'Fretes locais' },
                    { es: 'Mudanza completa', en: 'Full Moving Service', pt: 'Mudança completa' },
                    { es: 'Embalaje y protección', en: 'Packing & Protection', pt: 'Embalagem e proteção' },
                    { es: 'Transporte de carga', en: 'Cargo Transport', pt: 'Transporte de carga' },
                ]
            },
            {
                id: 'shoe_repair',
                label: { es: 'Zapatería', en: 'Shoe Repair', pt: 'Sapataria' },
                specialties: [
                    { es: 'Cambio de suela', en: 'Sole Replacement', pt: 'Troca de sola' },
                    { es: 'Reparación de tacón', en: 'Heel Repair', pt: 'Reparo de salto' },
                    { es: 'Costura / pegado', en: 'Stitching / Gluing', pt: 'Costura / colagem' },
                    { es: 'Restauración (cuero/gamuza)', en: 'Restoration (leather/suede)', pt: 'Restauração (couro/camurça)' },
                    { es: 'Limpieza profunda', en: 'Deep Cleaning', pt: 'Limpeza profunda' },
                ]
            },
            {
                id: 'auto_mechanic',
                label: { es: 'Mecánica Automotriz', en: 'Auto Mechanic', pt: 'Mecânica Auto' },
                specialties: [
                    { es: 'Diagnóstico (scanner)', en: 'Diagnosis (scanner)', pt: 'Diagnóstico (scanner)' },
                    { es: 'Cambio de aceite / filtros', en: 'Oil / Filter Change', pt: 'Troca de óleo / filtros' },
                    { es: 'Frenos', en: 'Brakes', pt: 'Freios' },
                    { es: 'Motor', en: 'Engine', pt: 'Motor' },
                    { es: 'Aire acondicionado', en: 'Air Conditioning', pt: 'Ar condicionado' },
                    { es: 'Emergencia / rescate', en: 'Emergency / Rescue', pt: 'Emergência / resgate' },
                ]
            },
            {
                id: 'moto_mechanic',
                label: { es: 'Mecánica de Motos', en: 'Moto Mechanic', pt: 'Mecânica Moto' },
                specialties: [
                    { es: 'Mantenimiento general', en: 'General Maintenance', pt: 'Manutenção geral' },
                    { es: 'Frenos', en: 'Brakes', pt: 'Freios' },
                    { es: 'Cadena / sprockets', en: 'Chain / Sprockets', pt: 'Corrente / sprockets' },
                    { es: 'Carburación / inyección', en: 'Carburetion / Injection', pt: 'Carburação / injeção' },
                    { es: 'Llantas', en: 'Tires', pt: 'Pneus' },
                ]
            }
        ]
    },

    // =========================================
    // PILAR 3: BELLEZA Y BIENESTAR
    // =========================================
    'beauty_wellness': {
        id: 'beauty_wellness',
        label: { es: 'Belleza y Bienestar', en: 'Beauty & Wellness', pt: 'Beleza e Bem-estar' },
        subcategories: [
            {
                id: 'hair',
                label: { es: 'Cabello', en: 'Hair', pt: 'Cabelo' },
                specialties: [
                    { es: 'Corte de Dama', en: 'Women\'s Haircut', pt: 'Corte Feminino' },
                    { es: 'Corte de Caballero', en: 'Men\'s Haircut', pt: 'Corte Masculino' },
                    { es: 'Colorimetría/Tintes', en: 'Colorimetry/Dyes', pt: 'Colorimetria/Tintura' },
                    { es: 'Tratamientos capilares', en: 'Hair Treatments', pt: 'Tratamentos capilares' },
                    { es: 'Peinados', en: 'Hairstyles', pt: 'Penteados' },
                ]
            },
            {
                id: 'nails',
                label: { es: 'Uñas', en: 'Nails', pt: 'Unhas' },
                specialties: [
                    { es: 'Manicure', en: 'Manicure', pt: 'Manicure' },
                    { es: 'Pedicure', en: 'Pedicure', pt: 'Pedicure' },
                    { es: 'Uñas acrílicas', en: 'Acrylic Nails', pt: 'Unhas acrílicas' },
                    { es: 'Gel/Semipermanente', en: 'Gel/Semi-permanent', pt: 'Gel/Semipermanente' },
                ]
            },
            {
                id: 'brows_lashes',
                label: { es: 'Cejas y Pestañas', en: 'Brows & Lashes', pt: 'Sobrancelhas e Cílios' },
                specialties: [
                    { es: 'Lifting de pestañas', en: 'Lash Lift', pt: 'Lifting de cílios' },
                    { es: 'Microblading', en: 'Microblading', pt: 'Microblading' },
                    { es: 'Extensiones de pestañas', en: 'Lash Extensions', pt: 'Extensões de cílios' },
                    { es: 'Laminado de cejas', en: 'Brow Lamination', pt: 'Laminação de sobrancelhas' },
                ]
            },
            {
                id: 'hair_removal',
                label: { es: 'Depilación', en: 'Hair Removal', pt: 'Depilação' },
                specialties: [
                    { es: 'Depilación con cera', en: 'Waxing', pt: 'Depilação com cera' },
                    { es: 'Depilación con hilo', en: 'Threading', pt: 'Epilação com linha' },
                    { es: 'Depilación láser', en: 'Laser Hair Removal', pt: 'Depilação a laser' },
                ]
            },
            {
                id: 'makeup',
                label: { es: 'Maquillaje', en: 'Makeup', pt: 'Maquiagem' },
                specialties: [
                    { es: 'Maquillaje social', en: 'Social Makeup', pt: 'Maquiagem social' },
                    { es: 'Maquillaje de novia', en: 'Bridal Makeup', pt: 'Maquiagem de noiva' },
                    { es: 'Maquillaje artístico', en: 'Artistic Makeup', pt: 'Maquiagem artística' },
                ]
            },
            {
                id: 'skincare',
                label: { es: 'Facial / Skincare', en: 'Skincare', pt: 'Cuidados com a Pele' },
                specialties: [
                    { es: 'Limpieza facial profunda', en: 'Deep Facial Cleansing', pt: 'Limpeza facial profunda' },
                    { es: 'Hidratación', en: 'Moisturizing', pt: 'Hidratação' },
                    { es: 'Tratamientos anti-edad', en: 'Anti-aging Treatments', pt: 'Tratamentos anti-idade' },
                ]
            },
            {
                id: 'massage',
                label: { es: 'Masajes', en: 'Massage', pt: 'Massagem' },
                specialties: [
                    { es: 'Masaje relajante', en: 'Relaxing Massage', pt: 'Massagem relaxante' },
                    { es: 'Masaje descontracturante', en: 'Deep Tissue Massage', pt: 'Massagem descontracturante' },
                    { es: 'Masaje terapéutico', en: 'Therapeutic Massage', pt: 'Massagem terapêutica' },
                    { es: 'Drenaje linfático', en: 'Lymphatic Drainage', pt: 'Drenagem linfática' },
                ]
            }
        ]
    },

    // =========================================
    // PILAR 4: SALUD & MEDICINA
    // =========================================
    'health_medicine': {
        id: 'health_medicine',
        label: { es: 'Salud & Medicina', en: 'Health & Medicine', pt: 'Saúde & Medicina' },
        subcategories: [
            {
                id: 'dentistry',
                label: { es: 'Odontología', en: 'Dentistry', pt: 'Odontologia' },
                specialties: [
                    { es: 'Caries y obturaciones', en: 'Cavities & Fillings', pt: 'Cáries e restaurações' },
                    { es: 'Brackets y ortodoncia', en: 'Braces & Orthodontics', pt: 'Aparelhos e ortodontia' },
                    { es: 'Blanqueamiento dental', en: 'Teeth Whitening', pt: 'Clareamento dental' },
                    { es: 'Implantes dentales', en: 'Dental Implants', pt: 'Implantes dentários' },
                    { es: 'Tratamiento de conductos / endodoncia', en: 'Root Canal / Endodontics', pt: 'Tratamento de canal / endodontia' },
                ]
            },
            {
                id: 'general_medicine',
                label: { es: 'Medicina General', en: 'General Medicine', pt: 'Medicina Geral' },
                specialties: [
                    { es: 'Consulta médica general', en: 'General Medical Consultation', pt: 'Consulta médica geral' },
                    { es: 'Control de presión y diabetes', en: 'Blood Pressure & Diabetes Control', pt: 'Controle de pressão e diabetes' },
                    { es: 'Certificados médicos y reconocimientos', en: 'Medical Certificates & Checkups', pt: 'Atestados médicos e exames' },
                    { es: 'Medicina familiar y preventiva', en: 'Family & Preventive Medicine', pt: 'Medicina familiar e preventiva' },
                    { es: 'Atención de urgencias menores', en: 'Minor Emergency Care', pt: 'Atendimento de emergências menores' },
                ]
            },
            {
                id: 'ophthalmology',
                label: { es: 'Oftalmología & Optometría', en: 'Ophthalmology & Optometry', pt: 'Oftalmologia & Optometria' },
                specialties: [
                    { es: 'Revisión y examen de la vista', en: 'Eye Exam', pt: 'Exame de visão' },
                    { es: 'Adaptación de lentes de contacto', en: 'Contact Lens Fitting', pt: 'Adaptação de lentes de contato' },
                    { es: 'Cirugía láser (LASIK)', en: 'Laser Surgery (LASIK)', pt: 'Cirurgia a laser (LASIK)' },
                    { es: 'Tratamiento de cataratas y glaucoma', en: 'Cataract & Glaucoma Treatment', pt: 'Tratamento de catarata e glaucoma' },
                    { es: 'Fondo de ojo y retina', en: 'Eye Fundus & Retina', pt: 'Fundo de olho e retina' },
                ]
            },
            {
                id: 'physiotherapy',
                label: { es: 'Fisioterapia & Rehabilitación', en: 'Physiotherapy & Rehabilitation', pt: 'Fisioterapia & Reabilitação' },
                specialties: [
                    { es: 'Rehabilitación post-cirugía o accidente', en: 'Post-surgery / Accident Rehab', pt: 'Reabilitação pós-cirurgia ou acidente' },
                    { es: 'Fisioterapia para dolor de espalda y cuello', en: 'Back & Neck Pain Physiotherapy', pt: 'Fisioterapia para dor nas costas e pescoço' },
                    { es: 'Fisioterapia deportiva', en: 'Sports Physiotherapy', pt: 'Fisioterapia esportiva' },
                    { es: 'Quiropraxia y ajuste vertebral', en: 'Chiropractic & Spinal Adjustment', pt: 'Quiropraxia e ajuste vertebral' },
                    { es: 'Electroterapia y ultrasonido terapéutico', en: 'Electrotherapy & Therapeutic Ultrasound', pt: 'Eletroterapia e ultrassom terapêutico' },
                ]
            },
            {
                id: 'mental_health',
                label: { es: 'Salud Mental', en: 'Mental Health', pt: 'Saúde Mental' },
                specialties: [
                    { es: 'Consulta psicológica', en: 'Psychological Consultation', pt: 'Consulta psicológica' },
                    { es: 'Terapia para ansiedad y depresión', en: 'Anxiety & Depression Therapy', pt: 'Terapia para ansiedade e depressão' },
                    { es: 'Terapia de pareja y familiar', en: 'Couples & Family Therapy', pt: 'Terapia de casal e familiar' },
                    { es: 'Psicología infantil y adolescente', en: 'Child & Teen Psychology', pt: 'Psicologia infantil e adolescente' },
                    { es: 'Consulta psiquiátrica', en: 'Psychiatric Consultation', pt: 'Consulta psiquiátrica' },
                ]
            },
            {
                id: 'gynecology',
                label: { es: 'Ginecología & Obstetricia', en: 'Gynecology & Obstetrics', pt: 'Ginecologia & Obstetrícia' },
                specialties: [
                    { es: 'Consulta ginecológica de rutina', en: 'Routine Gynecological Consultation', pt: 'Consulta ginecológica de rotina' },
                    { es: 'Control prenatal y ultrasonido', en: 'Prenatal Care & Ultrasound', pt: 'Pré-natal e ultrassom' },
                    { es: 'Papanicolau y colposcopía', en: 'Pap Smear & Colposcopy', pt: 'Papanicolau e colposcopia' },
                    { es: 'Planificación familiar y anticoncepción', en: 'Family Planning & Contraception', pt: 'Planejamento familiar e contracepção' },
                    { es: 'Colocación de dispositivo DIU / implante', en: 'IUD / Implant Placement', pt: 'Colocação de DIU / implante' },
                ]
            },
            {
                id: 'nutrition',
                label: { es: 'Nutrición & Dietética', en: 'Nutrition & Dietetics', pt: 'Nutrição & Dietética' },
                specialties: [
                    { es: 'Consulta nutricional y evaluación', en: 'Nutritional Consultation & Assessment', pt: 'Consulta nutricional e avaliação' },
                    { es: 'Plan alimenticio personalizado', en: 'Personalized Meal Plan', pt: 'Plano alimentar personalizado' },
                    { es: 'Nutrición para pérdida de peso', en: 'Weight Loss Nutrition', pt: 'Nutrição para perda de peso' },
                    { es: 'Nutrición deportiva', en: 'Sports Nutrition', pt: 'Nutrição esportiva' },
                    { es: 'Nutrición para diabetes y enfermedades crónicas', en: 'Nutrition for Diabetes & Chronic Conditions', pt: 'Nutrição para diabetes e doenças crônicas' },
                ]
            },
            {
                id: 'pediatrics',
                label: { es: 'Pediatría', en: 'Pediatrics', pt: 'Pediatria' },
                specialties: [
                    { es: 'Control del niño sano (crecimiento)', en: 'Well-child Visit (growth)', pt: 'Consulta de puericultura (crescimento)' },
                    { es: 'Vacunación y calendario de vacunas', en: 'Vaccination & Vaccine Schedule', pt: 'Vacinação e calendário de vacinas' },
                    { es: 'Tratamiento de enfermedades respiratorias', en: 'Respiratory Illness Treatment', pt: 'Tratamento de doenças respiratórias' },
                    { es: 'Urgencias pediátricas (fiebre, dolores)', en: 'Pediatric Emergencies (fever, pain)', pt: 'Urgências pediátricas (febre, dores)' },
                    { es: 'Consulta de adolescentes', en: 'Adolescent Consultation', pt: 'Consulta de adolescentes' },
                ]
            },
        ]
    }
};


// ==========================================
// TYPE for specialty
// ==========================================
export type SpecialtyLabel = { es: string; en: string; pt: string };

// ==========================================
// HELPERS
// ==========================================

export const getAllCategories = () => {
    return Object.values(TAXONOMY).flatMap(group => group.subcategories.map(sub => ({
        ...sub,
        groupLabel: group.label,
        groupId: group.id
    })));
};

export const getCategoryById = (id: string) => {
    for (const group of Object.values(TAXONOMY)) {
        const found = group.subcategories.find(s => s.id === id);
        if (found) return found;
    }
    return null;
};
