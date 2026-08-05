import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Cities ────────────────────────────────────────────────────────────────────
# Fields: city, slug, region, desc, note, sectors, faq1, faq3, nearby
# note     — hero paragraph (enriched, ~80-100 words)
# sectors  — named venues/districts for schema + "Why" section
# faq1     — full HTML FAQ answer for Q1 (What jobs are available?)
# faq3     — full HTML FAQ answer for Q3 (What is BS7858 vetting?)
# nearby   — list of (City Name, slug) tuples for internal cross-links

cities = [
    {
        "city": "London",
        "slug": "security-jobs-london",
        "region": "Greater London",
        "desc": "the UK&apos;s largest security jobs market",
        "note": "London has the highest concentration of licensed security roles in the UK. From the West End&apos;s entertainment strips and Soho&apos;s nightlife to the glass towers of Canary Wharf and the City of London&apos;s corporate estates, security demand is constant and varied. Major transport hubs including Heathrow, St Pancras and Waterloo require round-the-clock guarding. Stadium events at Wembley, the O2 Arena and Tottenham Hotspur Stadium drive door supervisor demand across the capital. Luxury retail on Bond Street and Knightsbridge, residential concierge roles in Mayfair and Chelsea, and a large close protection sector make London the UK&apos;s most diverse security employment market.",
        "sectors": "West End entertainment venues and Soho nightlife, City of London and Canary Wharf corporate estates, Heathrow Airport and major transport hubs, luxury retail on Bond Street and Knightsbridge, residential concierge in Mayfair and Chelsea, and stadium security at Wembley and the O2 Arena",
        "faq1": "UKSecurityJobs lists verified security vacancies across Greater London covering all SIA licence types. Door supervisor roles are concentrated in the West End&apos;s entertainment districts, Soho nightlife venues and at major event venues including the O2 Arena and Wembley Stadium. Security guard positions are in demand at City of London and Canary Wharf corporate towers, Bond Street and Knightsbridge retail, and across the capital&apos;s ongoing construction and development pipeline. CCTV operator roles are available in control rooms serving residential developments, transport hubs and retail environments. Close protection work in London &mdash; particularly across Mayfair, Kensington and Chelsea &mdash; is among the most active in Europe. Every role listed requires a valid SIA licence. Employers are verified before they can post.",
        "faq3": "BS7858 is the British Standard for vetting individuals in secure environments, and it is mandatory for virtually every security employer in London. It requires a verified 5-year employment history with no unexplained gaps, a complete 5-year address history, identity verification and criminal record disclosure. In London&apos;s competitive market &mdash; particularly for roles in City of London financial institutions, Canary Wharf corporate estates and luxury retail environments on Bond Street &mdash; employers routinely expect full BS7858 compliance before a candidate starts work. Transport hub operators at Heathrow and major stations also enforce strict vetting timelines. UKSecurityJobs candidates complete their full BS7858-ready profile before applying, giving London employers verified employment history, address records and references from day one.",
        "nearby": [("Manchester", "security-jobs-manchester"), ("Birmingham", "security-jobs-birmingham"), ("Bristol", "security-jobs-bristol")],
    },
    {
        "city": "Manchester",
        "slug": "security-jobs-manchester",
        "region": "Greater Manchester",
        "desc": "one of the UK&apos;s most active security markets outside London",
        "note": "Manchester&apos;s security market is among the most active outside London, driven by a thriving night-time economy, world-class events venues and a rapidly expanding corporate sector. The Northern Quarter, Deansgate and Piccadilly Gardens require large numbers of door supervisors across hundreds of licensed premises. MediaCityUK in Salford generates demand for corporate security and access control. The AO Arena &mdash; one of Europe&apos;s busiest entertainment venues &mdash; creates consistent event security recruitment. Manchester Airport, the UK&apos;s third busiest, employs security professionals in passenger, airside and cargo roles. Spinningfields financial district and growing residential towers add further demand for static guards and CCTV operators.",
        "sectors": "Northern Quarter and Deansgate nightlife venues, the AO Arena and major events, MediaCityUK corporate campus in Salford, Manchester Airport, Trafford Centre and city centre retail, Spinningfields financial district, and residential concierge in Deansgate and Castlefield",
        "faq1": "UKSecurityJobs lists verified security vacancies across Greater Manchester spanning all major licence types. Door supervisor demand is driven by the Northern Quarter and Deansgate&apos;s large cluster of licensed premises, plus event security at the AO Arena &mdash; one of Europe&apos;s busiest music venues. Security guard and static guarding roles are available at MediaCityUK corporate offices in Salford, Spinningfields financial district, and major retail sites including the Trafford Centre and Arndale. Manchester Airport generates ongoing demand for security officers across passenger, airside and cargo environments. CCTV operator positions are available in council and corporate control rooms across the city. Every role requires a valid SIA licence and every employer on the platform is verified before posting.",
        "faq3": "BS7858 vetting is required by virtually every security employer operating in Greater Manchester. The standard requires a verified 5-year employment and address history, identity documents and criminal record disclosure. In Manchester, BS7858 compliance is particularly enforced by Manchester Airport&apos;s security contractors, MediaCityUK&apos;s corporate occupiers and financial sector employers in Spinningfields &mdash; where enhanced background checks are often a contractual requirement. Licensed venue operators across the Northern Quarter and Deansgate also typically require full BS7858 screening before door supervisors start. UKSecurityJobs candidates build their complete BS7858-ready profile &mdash; including full employment history, address records and reference contacts &mdash; before applying for any role, giving Manchester employers everything they need to begin vetting immediately.",
        "nearby": [("Liverpool", "security-jobs-liverpool"), ("Leeds", "security-jobs-leeds"), ("Birmingham", "security-jobs-birmingham")],
    },
    {
        "city": "Birmingham",
        "slug": "security-jobs-birmingham",
        "region": "West Midlands",
        "desc": "the UK&apos;s second city and a major hub for security employment",
        "note": "Birmingham is the UK&apos;s second city and one of its largest security employment markets. The Bullring and Grand Central generate extensive retail security and CCTV demand. The NEC &mdash; one of Europe&apos;s largest exhibition centres &mdash; drives major event security recruitment across its packed calendar. Broad Street and Brindleyplace power Birmingham&apos;s night-time economy, requiring large numbers of SIA-licensed door supervisors. Birmingham Airport and the HS2 construction corridor create roles in transport and construction security. The Mailbox, Paradise and Brindleyplace business districts add strong demand for corporate security officers, access control and static guards across the city&apos;s growing office estate.",
        "sectors": "the Bullring and Grand Central retail, the NEC exhibition centre, Broad Street and Brindleyplace nightlife, Birmingham Airport, HS2 and major construction sites, Mailbox and Paradise corporate district, and manufacturing and logistics facilities across the West Midlands",
        "faq1": "UKSecurityJobs lists verified security vacancies across the West Midlands with Birmingham as the primary hub. Retail security and CCTV operator roles are in high demand at the Bullring, Grand Central and Birmingham&apos;s major shopping centres. Door supervisor vacancies are plentiful across Broad Street&apos;s nightlife strip and Brindleyplace entertainment venues. The NEC regularly recruits event security personnel for major exhibitions and concerts. Birmingham Airport generates year-round demand for passenger-facing and airside security officers. Corporate guarding roles are available across the Mailbox, Paradise and Brindleyplace office districts. Birmingham&apos;s manufacturing base and the HS2 construction corridor also drive consistent demand for construction site security. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 is the mandatory vetting standard across Birmingham&apos;s security sector. The standard requires a full verified 5-year employment history with no unexplained gaps, a complete address history, right to work documentation and criminal record disclosure. In Birmingham, BS7858 compliance is strictly enforced by NEC venue operators, Birmingham Airport security contractors and corporate estate managers across the Mailbox and Paradise districts. Retail security employers at the Bullring also require full vetting compliance before officers start. HS2 and major construction sites in the city additionally require enhanced clearance for site security personnel. UKSecurityJobs candidates complete their full BS7858-ready profile &mdash; covering employment history, addresses and reference contacts &mdash; before applying for any Birmingham role, giving employers a significant head start.",
        "nearby": [("Manchester", "security-jobs-manchester"), ("Coventry", "security-jobs-coventry"), ("Nottingham", "security-jobs-nottingham")],
    },
    {
        "city": "Leeds",
        "slug": "security-jobs-leeds",
        "region": "West Yorkshire",
        "desc": "a fast-growing market for licensed security professionals",
        "note": "Leeds is one of the UK&apos;s fastest-growing cities and has a security market to match. Trinity Leeds and the White Rose Centre are major retail anchors generating significant static guarding and CCTV demand. The First Direct Arena hosts major concerts and sporting events requiring experienced event security teams. Leeds&apos;s financial district &mdash; home to large insurance, legal and financial services employers around Park Row and Wellington Street &mdash; drives demand for corporate security and access control. Call Lane, the Headrow and Boar Lane fuel the city&apos;s active night-time economy. Leeds Bradford Airport and a large student population across two universities add further security requirements.",
        "sectors": "Trinity Leeds and White Rose Centre retail, the First Direct Arena and major events, the financial and legal district around Park Row, Call Lane and Headrow nightlife venues, Leeds Bradford Airport, university campuses and student accommodation, and South Bank regeneration construction sites",
        "faq1": "UKSecurityJobs lists verified security vacancies across West Yorkshire with Leeds as the primary hub. Door supervisor roles are available across Call Lane&apos;s nightlife strip, Headrow and Boar Lane entertainment venues, and major concert security at the First Direct Arena. Static guarding and CCTV operator positions are in demand at Trinity Leeds, the White Rose Centre and major retail parks. Leeds&apos;s financial district &mdash; including major insurance and legal employers around Wellington Street and Park Row &mdash; generates consistent demand for corporate security and access control. Leeds Bradford Airport employs security officers across passenger and airside environments. University of Leeds and Leeds Beckett campuses add campus security demand. Every role requires a current valid SIA licence.",
        "faq3": "BS7858 vetting applies across Leeds&apos;s security sector and is enforced by most reputable employers in the city. The standard requires a verified 5-year employment history with no unexplained gaps, full address records, right to work verification and criminal record disclosure. In Leeds, financial district employers &mdash; including major insurers and law firms around Park Row and Wellington Street &mdash; typically require full BS7858 compliance and may apply enhanced screening for access to sensitive areas. First Direct Arena and major events contractors require pre-deployment vetting. Leeds Bradford Airport&apos;s security contractors enforce strict background check timelines. UKSecurityJobs candidates complete their full BS7858-ready profile &mdash; including employment history, address records and reference contacts &mdash; before applying for any Leeds role, giving employers everything they need from day one.",
        "nearby": [("Manchester", "security-jobs-manchester"), ("Sheffield", "security-jobs-sheffield"), ("Newcastle", "security-jobs-newcastle")],
    },
    {
        "city": "Liverpool",
        "slug": "security-jobs-liverpool",
        "region": "Merseyside",
        "desc": "a diverse and active security jobs market on the North West coast",
        "note": "Liverpool has a diverse and active security market driven by its waterfront venues, extensive licensed premises and major events calendar. Albert Dock and the Waterfront are home to hotels, restaurants and bars requiring round-the-clock security coverage. The M&amp;S Bank Arena is one of the UK&apos;s premier concert venues, with Everton&apos;s new Bramley-Moore Dock stadium adding further large-scale event security demand. Liverpool ONE and the city centre retail district generate significant static guarding and CCTV roles. Concert Square and Matthew Street form the heart of the city&apos;s legendary night-time economy. Liverpool John Lennon Airport employs security professionals across passenger and airside roles throughout the year.",
        "sectors": "Albert Dock and the Waterfront, the M&amp;S Bank Arena and major events, Liverpool ONE and city centre retail, Concert Square and Matthew Street nightlife, Liverpool John Lennon Airport, the Knowledge Quarter corporate offices, and residential and leisure developments on the waterfront",
        "faq1": "UKSecurityJobs lists verified security vacancies across Merseyside, with the strongest demand in Liverpool city centre. Door supervisor positions are plentiful across Concert Square, Matthew Street and the Ropewalks &mdash; Liverpool&apos;s core entertainment districts. Albert Dock and the Waterfront generate demand for security officers at hotels, restaurants and leisure venues throughout the year. The M&amp;S Bank Arena and Everton&apos;s new stadium at Bramley-Moore Dock create major event security recruitment needs. Liverpool ONE and major city centre retail sites employ static guards and CCTV operators. Liverpool John Lennon Airport generates year-round security vacancies in passenger-facing and airside roles. Corporate security positions are available in the Knowledge Quarter and Liverpool Science Park. Every role requires a valid SIA licence.",
        "faq3": "BS7858 vetting is widely required across Liverpool&apos;s security sector. The standard calls for a verified 5-year employment history with no unexplained gaps, full address history, identity and right to work checks, and criminal record disclosure. In Liverpool, BS7858 compliance is enforced by Liverpool John Lennon Airport&apos;s contracted operators, M&amp;S Bank Arena event security providers, and corporate occupiers in the Knowledge Quarter. Waterfront hotel and hospitality venues at Albert Dock and major employers across the city also typically require full pre-employment screening. UKSecurityJobs candidates complete their full BS7858-ready profile &mdash; including verified employment history, addresses and reference contacts &mdash; before applying for any Liverpool role, giving employers everything needed to begin formal vetting without delay.",
        "nearby": [("Manchester", "security-jobs-manchester"), ("Leeds", "security-jobs-leeds"), ("Birmingham", "security-jobs-birmingham")],
    },
    {
        "city": "Sheffield",
        "slug": "security-jobs-sheffield",
        "region": "South Yorkshire",
        "desc": "a steady market for SIA-licensed security staff",
        "note": "Sheffield&apos;s universities, retail centres, entertainment venues and industrial sites require a broad range of SIA-licensed security professionals throughout the year.",
        "sectors": "university campuses and student accommodation, Meadowhall Shopping Centre, entertainment and nightlife venues, manufacturing sites, and corporate offices",
        "faq1": "UKSecurityJobs lists verified security vacancies across South Yorkshire with Sheffield as the primary hub. Door supervisor roles are available across the city&apos;s entertainment venues and student nightlife districts. Retail security and CCTV operator positions are in demand at Meadowhall Shopping Centre &mdash; one of the UK&apos;s largest retail parks &mdash; and across the city centre. Manufacturing and industrial site security is consistent across Sheffield&apos;s engineering corridor. University of Sheffield and Sheffield Hallam campuses generate campus security demand. Corporate security roles are available across the growing city centre office market. Every vacancy requires a valid SIA licence and every employer on the platform is verified.",
        "faq3": "BS7858 vetting is required across Sheffield&apos;s security sector. The standard requires a full verified 5-year employment and address history, identity checks and criminal record disclosure. In Sheffield, Meadowhall&apos;s retail security operators, major manufacturing and industrial facilities and corporate employers enforce full BS7858 compliance before officers start work. University campus security providers also require pre-employment vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying, giving Sheffield employers everything they need to begin formal vetting from day one.",
        "nearby": [("Leeds", "security-jobs-leeds"), ("Manchester", "security-jobs-manchester"), ("Nottingham", "security-jobs-nottingham")],
    },
    {
        "city": "Bristol",
        "slug": "security-jobs-bristol",
        "region": "South West England",
        "desc": "the South West&apos;s largest and most active security market",
        "note": "Bristol is the South West&apos;s largest city and its strongest security employment market. Cabot Circus and Cribbs Causeway are major retail anchors requiring static guards, loss prevention officers and CCTV operators. The Harbourside drives significant door supervisor demand across restaurants, music venues and outdoor events spaces throughout the year. Temple Quay &mdash; Bristol&apos;s primary office district &mdash; generates demand for corporate security and access control. Bristol Airport is the UK&apos;s eighth busiest and employs security professionals across passenger, airside and cargo environments. Ashton Gate Stadium and a large student population across two universities add further security requirements to one of England&apos;s most varied regional markets.",
        "sectors": "Cabot Circus and Cribbs Causeway retail, the Harbourside bars and music venues, Temple Quay corporate offices, Bristol Airport, Ashton Gate Stadium and events, university campuses across Clifton and Frenchay, and regeneration construction sites across the city",
        "faq1": "UKSecurityJobs lists verified security vacancies across Bristol and the wider South West region. Door supervisor roles are in consistent demand across the Harbourside&apos;s entertainment venues, Clifton and Whiteladies Road nightlife, and events at Ashton Gate Stadium. Retail security and CCTV operator positions are available at Cabot Circus, Cribbs Causeway and major retail parks. Corporate security and access control roles are available in Temple Quay and the expanding Harbourside office district. Bristol Airport employs security officers across passenger-facing, airside and cargo operations year-round. University of Bristol and University of the West of England campuses generate campus security demand. Construction security roles are also available across Bristol&apos;s ongoing city-centre regeneration. Every role requires a valid SIA licence.",
        "faq3": "BS7858 vetting is a standard requirement across Bristol&apos;s security sector. The standard requires a fully verified 5-year employment and address history, identity and right to work checks, and criminal record disclosure. In Bristol, BS7858 compliance is enforced particularly rigorously by Bristol Airport&apos;s contracted security operators, Temple Quay corporate employers and major retail operators at Cabot Circus. Harbourside venue operators and large nightlife operators across the city also require pre-employment vetting. UKSecurityJobs candidates complete their full BS7858-ready profile &mdash; including employment history, address records and reference contacts &mdash; before applying for any Bristol role, giving South West employers everything they need to begin formal vetting without delay.",
        "nearby": [("Cardiff", "security-jobs-cardiff"), ("Birmingham", "security-jobs-birmingham"), ("Southampton", "security-jobs-southampton")],
    },
    {
        "city": "Glasgow",
        "slug": "security-jobs-glasgow",
        "region": "Scotland",
        "desc": "Scotland&apos;s largest security jobs market",
        "note": "Glasgow is Scotland&apos;s largest city and its busiest security employment market. The SEC Centre &mdash; home to the OVO Hydro arena and SEC Armadillo &mdash; is one of the UK&apos;s most active events complexes, generating large-scale event security demand throughout the year. Sauchiehall Street and the Merchant City form the core of Glasgow&apos;s extensive night-time economy, requiring large numbers of SIA-licensed door supervisors. Buchanan Street and the St Enoch Centre anchor the city&apos;s retail security needs. Glasgow Airport and Queen Street Station add transport security demand. The International Financial Services District and expanding Clyde waterfront are driving growth in corporate guarding and concierge roles.",
        "sectors": "the SEC Centre, OVO Hydro and SSE events complex, Sauchiehall Street and Merchant City nightlife, Buchanan Street and St Enoch Centre retail, Glasgow Airport, the International Financial Services District, and Clyde waterfront residential and corporate developments",
        "faq1": "UKSecurityJobs lists verified security vacancies across Glasgow spanning all SIA licence types. Door supervisor demand is driven by the city&apos;s extensive licensed premises across Sauchiehall Street, the Merchant City and the West End. The SEC Centre &mdash; which includes the OVO Hydro and SEC Armadillo &mdash; is one of the UK&apos;s busiest events venues, generating consistent event security recruitment throughout the year. Security guard positions are available at corporate offices in the International Financial Services District and across the expanding Clyde waterfront. Retail security roles are in demand at Buchanan Street&apos;s major stores and the St Enoch Centre. Glasgow Airport employs security professionals in both passenger-facing and airside roles. All roles require a valid SIA licence and are posted by verified security companies.",
        "faq3": "BS7858 vetting is the standard across Glasgow&apos;s security sector. The standard requires a full verified 5-year employment history, complete address records and identity and criminal record checks. In Glasgow, the SEC Centre&apos;s contracted security operators, Glasgow Airport&apos;s security contractors and corporate employers in the International Financial Services District all require full BS7858 compliance before officers begin work. Sauchiehall Street venue operators routinely carry out pre-employment screening in line with the standard. Glasgow&apos;s residential concierge sector along the Clyde waterfront also expects vetting compliance for all access control roles. UKSecurityJobs candidates complete their full BS7858-ready profile before applying &mdash; including verified employment history, address history and referee details &mdash; giving Glasgow employers everything needed to start formal vetting immediately.",
        "nearby": [("Edinburgh", "security-jobs-edinburgh"), ("Newcastle", "security-jobs-newcastle"), ("Aberdeen", "security-jobs-aberdeen")],
    },
    {
        "city": "Edinburgh",
        "slug": "security-jobs-edinburgh",
        "region": "Scotland",
        "desc": "a specialist security market with strong year-round demand",
        "note": "Edinburgh&apos;s world-famous festivals, major hotels, corporate district and historic venues create consistent demand for experienced, professional SIA-licensed security officers throughout the year.",
        "sectors": "Edinburgh Festival and Hogmanay events, major hotels and hospitality venues, historic tourist attractions, corporate offices, and city centre retail",
        "faq1": "UKSecurityJobs lists verified security vacancies across Edinburgh spanning all major SIA licence types. Event security demand peaks sharply during the Edinburgh Festival Fringe and Hogmanay, when large numbers of SIA-licensed door supervisors and event security officers are required across the city&apos;s venues and outdoor sites. Year-round demand comes from major hotels and hospitality venues along Princes Street and the Royal Mile, corporate offices in the Exchange financial district, and heritage tourist attractions requiring professional, customer-facing officers. City centre retail on Princes Street and at Ocean Terminal generates retail security and CCTV demand. Every role listed requires a valid SIA licence and is posted by a verified employer.",
        "faq3": "BS7858 vetting is required across Edinburgh&apos;s security sector. The standard requires a verified 5-year employment and address history with no unexplained gaps, identity verification and criminal record disclosure. Edinburgh&apos;s major hotel groups, Exchange district corporate employers and festival event operators all require full BS7858 compliance before security officers start work. Historic attraction security providers &mdash; including those operating at Edinburgh Castle and the National Museum &mdash; also apply thorough pre-employment screening. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Edinburgh role, giving Scottish employers a significant head start with employment history, addresses and references already collected.",
        "nearby": [("Glasgow", "security-jobs-glasgow"), ("Newcastle", "security-jobs-newcastle"), ("Aberdeen", "security-jobs-aberdeen")],
    },
    {
        "city": "Newcastle",
        "slug": "security-jobs-newcastle",
        "region": "North East England",
        "desc": "the North East&apos;s primary security employment hub",
        "note": "Newcastle upon Tyne has one of the UK&apos;s most active night-time economies, and it shows in the security recruitment market. The Bigg Market, Quayside and Grey Street are home to hundreds of licensed premises requiring SIA-licensed door supervisors across Thursday-to-Sunday nights. Utilita Arena is the North East&apos;s largest entertainment venue, generating consistent event security demand. Eldon Square and intu Metrocentre in Gateshead are the region&apos;s largest retail destinations, creating significant static guarding and CCTV operator demand. Newcastle International Airport employs security officers in passenger and airside roles. A growing corporate sector in Quayside office developments and a large student population across Newcastle and Northumbria universities add further demand.",
        "sectors": "Bigg Market, Quayside and Grey Street licensed premises, Utilita Arena and major events, Eldon Square and intu Metrocentre retail, Newcastle International Airport, Quayside corporate offices, and Newcastle and Northumbria university campuses",
        "faq1": "UKSecurityJobs lists verified security vacancies across the North East, with Newcastle upon Tyne as the primary employment hub. Door supervisor demand is particularly strong across the Bigg Market, Quayside and Grey Street &mdash; areas containing some of the UK&apos;s densest concentrations of licensed premises. Event security at Utilita Arena, St James&apos; Park and major civic events adds further demand across the year. Retail security and CCTV operator positions are available at Eldon Square, intu Metrocentre in Gateshead and major retail parks across the region. Newcastle International Airport employs security officers across passenger-facing and airside roles. Corporate security is available across the growing Quayside office estate. Newcastle and Northumbria universities generate campus security demand. All roles require a valid SIA licence.",
        "faq3": "BS7858 vetting is required by virtually all security employers in Newcastle and the wider North East. The standard requires a verified 5-year employment history, complete address records, identity verification and criminal record disclosure. In Newcastle, BS7858 compliance is most rigorously enforced by Newcastle International Airport&apos;s contracted operators, Quayside corporate employers and major retail site security contractors at Eldon Square and the Metrocentre. Event security operators at Utilita Arena and St James&apos; Park also require pre-deployment vetting. UKSecurityJobs candidates build their full BS7858-ready profile before applying &mdash; including verified employment history, address history and referee details &mdash; giving North East employers everything needed to begin formal vetting from day one.",
        "nearby": [("Leeds", "security-jobs-leeds"), ("Glasgow", "security-jobs-glasgow"), ("Edinburgh", "security-jobs-edinburgh")],
    },
    {
        "city": "Nottingham",
        "slug": "security-jobs-nottingham",
        "region": "East Midlands",
        "desc": "a consistent market for licensed security professionals",
        "note": "Nottingham has one of the UK&apos;s largest student populations, an active night-time economy and a strong retail sector &mdash; all of which drive consistent security employment. The Lace Market and Hockley quarter form the heart of Nottingham&apos;s nightlife, with dozens of licensed premises requiring SIA door supervisors across peak nights. Broadmarsh&apos;s redevelopment and the Victoria Centre are the city&apos;s primary retail security environments. Nottingham&apos;s two major universities generate demand for campus security and student accommodation guarding. East Midlands Airport &mdash; serving significant air freight and passenger operations &mdash; employs security officers in a range of roles. Corporate security demand is growing alongside Nottingham&apos;s expanding business and technology sector.",
        "sectors": "Lace Market and Hockley quarter nightlife, Broadmarsh redevelopment and Victoria Centre retail, University of Nottingham and Nottingham Trent campuses, East Midlands Airport, corporate offices in the city centre, and construction and regeneration sites across the city",
        "faq1": "UKSecurityJobs lists verified security vacancies across Nottingham and the East Midlands region. Door supervisor roles are in strong demand across the Lace Market, Hockley quarter and Nottingham&apos;s extensive cluster of licensed premises &mdash; one of the busiest night-time economies outside the major cities. Retail security and CCTV operator positions are available at the Victoria Centre, Broadmarsh and major retail parks. Campus security roles are available at the University of Nottingham&apos;s main campus and Nottingham Trent&apos;s city-centre sites. East Midlands Airport &mdash; one of the UK&apos;s main air freight hubs &mdash; employs security officers in passenger and airside roles. Corporate guarding roles are available across Nottingham&apos;s expanding business district. Every vacancy requires a valid SIA licence and every employer on the platform is verified.",
        "faq3": "BS7858 vetting is a requirement across Nottingham&apos;s security sector and is enforced by most established employers in the city. The standard requires a verified 5-year employment and address history with no unexplained gaps, right to work checks and criminal record disclosure. In Nottingham, BS7858 compliance is particularly enforced by East Midlands Airport&apos;s contracted security operators, university campus security providers and corporate office managers across the city centre. Larger nightlife operators across the Lace Market and Hockley quarter also require pre-employment vetting before door supervisors start work. UKSecurityJobs candidates build their full BS7858-ready profile &mdash; including verified employment history, address history and reference contacts &mdash; before applying, giving Nottingham employers everything needed to begin formal vetting from day one.",
        "nearby": [("Birmingham", "security-jobs-birmingham"), ("Leeds", "security-jobs-leeds"), ("Leicester", "security-jobs-leicester")],
    },
    {
        "city": "Leicester",
        "slug": "security-jobs-leicester",
        "region": "East Midlands",
        "desc": "a growing security market in the East Midlands",
        "note": "Leicester&apos;s diverse retail sector, manufacturing and logistics industry and growing events scene create steady demand for security guards, door supervisors and CCTV operators.",
        "sectors": "Highcross Shopping Centre and major retail parks, manufacturing and logistics operations, city centre licensed premises, events venues including the Utilita Arena Leicester, and corporate offices",
        "faq1": "UKSecurityJobs lists verified security vacancies across Leicester and the East Midlands. Retail security and CCTV operator positions are available at Highcross Shopping Centre and major retail parks. Door supervisor roles are in demand across the city&apos;s night-time economy and licensed premises. Manufacturing and logistics security is a significant sector in Leicester, with demand from major warehouse and distribution operations. University of Leicester and De Montfort University campuses generate campus security demand. Corporate security roles are growing alongside Leicester&apos;s expanding business sector. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is standard across Leicester&apos;s security sector. The standard requires a verified 5-year employment history with no unexplained gaps, full address records and criminal record checks. Major logistics and manufacturing employers, retail security operators at Highcross and the city&apos;s corporate office managers all enforce BS7858 compliance before officers start work. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Leicester role, giving employers a strong start to formal vetting.",
        "nearby": [("Nottingham", "security-jobs-nottingham"), ("Birmingham", "security-jobs-birmingham"), ("Coventry", "security-jobs-coventry")],
    },
    {
        "city": "Cardiff",
        "slug": "security-jobs-cardiff",
        "region": "Wales",
        "desc": "Wales&apos;s largest security employment market",
        "note": "Cardiff is the security recruitment capital of Wales, with strong demand across its city centre, waterfront and major sports venues. The Principality Stadium &mdash; home to Welsh rugby internationals and major concerts &mdash; is one of the UK&apos;s most active event venues, generating significant security demand across its packed calendar. Cardiff Bay is home to the Senedd, BBC Wales studios, bars, restaurants and waterfront leisure venues. St David&apos;s and St David&apos;s Dewi Sant form one of the UK&apos;s largest shopping centre complexes, requiring substantial retail security and CCTV coverage. Central Square &mdash; Cardiff&apos;s emerging media and legal district &mdash; is driving growth in corporate security roles. St Mary Street and Mill Lane fuel the city&apos;s active night-time economy.",
        "sectors": "the Principality Stadium and major sports and concert events, Cardiff Bay waterfront venues and BBC Wales studios, St David&apos;s and St David&apos;s Dewi Sant retail, Central Square media and legal offices, St Mary Street and Mill Lane nightlife, and Cardiff Airport",
        "faq1": "UKSecurityJobs lists verified security vacancies across Wales with the strongest concentration in Cardiff. Event security demand is significant &mdash; the Principality Stadium hosts Welsh rugby internationals, Six Nations matches and major concerts, requiring large teams of SIA-licensed door supervisors and security officers throughout the year. Cardiff Bay generates demand for security officers at waterfront venues, BBC Wales studios and the Senedd estate. Retail security and CCTV roles are available at St David&apos;s and St David&apos;s Dewi Sant shopping centres. Door supervisor positions are in demand across St Mary Street and Mill Lane nightlife. Corporate security roles are growing in Central Square&apos;s expanding office district. Cardiff Airport adds transport security demand. Every role requires a current valid SIA licence.",
        "faq3": "BS7858 vetting is standard practice across Cardiff&apos;s security sector and a requirement for all reputable employers in the city. The standard requires a verified 5-year employment and address history with no unexplained gaps, right to work verification and criminal record disclosure. In Cardiff, BS7858 compliance is enforced by Principality Stadium&apos;s contracted security operators, Cardiff Airport security contractors, BBC Wales studio security, and corporate employers in Central Square. St David&apos;s shopping centre security management also requires full pre-employment screening. UKSecurityJobs candidates complete their full BS7858-ready profile &mdash; including employment history, address records and reference contacts &mdash; before applying for any Cardiff or Wales role, giving employers everything they need to begin formal vetting from day one.",
        "nearby": [("Bristol", "security-jobs-bristol"), ("Birmingham", "security-jobs-birmingham"), ("Southampton", "security-jobs-southampton")],
    },
    {
        "city": "Southampton",
        "slug": "security-jobs-southampton",
        "region": "Hampshire",
        "desc": "a growing security market on the South Coast",
        "note": "Southampton&apos;s port facilities, large retail centres, university campuses and active night-time economy create consistent demand for SIA-licensed security professionals.",
        "sectors": "port and cruise terminal facilities, Westquay and city centre retail, University of Southampton campus, night-time economy venues, and waterfront business district offices",
        "faq1": "UKSecurityJobs lists verified security vacancies across Southampton and Hampshire. Southampton&apos;s port and cruise terminal facilities &mdash; among the UK&apos;s busiest &mdash; generate significant demand for maritime-adjacent and access control security roles. Retail security and CCTV operator positions are available at Westquay Shopping Centre and major retail parks. Door supervisor roles are in demand across the city&apos;s night-time economy and student venues. University of Southampton campus generates demand for campus security. Corporate security roles are available in the waterfront business district. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Southampton&apos;s security sector. Southampton&apos;s port and cruise terminal operators apply particularly rigorous background checks, with security contractors often requiring enhanced DBS and maritime vetting in addition to standard BS7858. Retail and corporate employers at Westquay and the waterfront business district also enforce full compliance. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Southampton role, giving employers everything they need to begin vetting without delay.",
        "nearby": [("Bristol", "security-jobs-bristol"), ("Portsmouth", "security-jobs-portsmouth"), ("Brighton", "security-jobs-brighton")],
    },
    {
        "city": "Portsmouth",
        "slug": "security-jobs-portsmouth",
        "region": "Hampshire",
        "desc": "an active security market on the South Coast",
        "note": "Portsmouth&apos;s naval heritage, busy retail centres, waterfront developments and active night-time economy support strong demand for licensed security professionals.",
        "sectors": "Portsmouth Naval Base and defence-adjacent facilities, Gunwharf Quays retail and leisure, the Historic Dockyard, and city centre licensed premises",
        "faq1": "UKSecurityJobs lists verified security vacancies across Portsmouth and the Hampshire coastline. Portsmouth Naval Base and the Historic Dockyard generate demand for defence-adjacent and heritage security roles. Gunwharf Quays &mdash; Portsmouth&apos;s major waterfront retail and leisure development &mdash; is a significant employer of retail security and CCTV operators. Door supervisor roles are available across the city&apos;s night-time economy. University of Portsmouth generates campus security demand. Every vacancy requires a valid SIA licence and every employer is verified before posting.",
        "faq3": "BS7858 vetting is a firm requirement across Portsmouth&apos;s security sector, particularly given the city&apos;s naval and defence heritage. Portsmouth Naval Base&apos;s contracted security providers apply strict background screening. Gunwharf Quays retail security and university campus providers also require full BS7858 compliance. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Portsmouth role.",
        "nearby": [("Southampton", "security-jobs-southampton"), ("Brighton", "security-jobs-brighton"), ("Bristol", "security-jobs-bristol")],
    },
    {
        "city": "Brighton",
        "slug": "security-jobs-brighton",
        "region": "East Sussex",
        "desc": "a busy security market on the South Coast",
        "note": "Brighton&apos;s large entertainment and events sector, busy seafront and active night-time economy make it one of the most active security recruitment markets on the South Coast.",
        "sectors": "seafront and pier entertainment, night-time economy and licensed venues, events and festivals including Brighton Festival and Great Escape, Churchill Square retail, and university campuses",
        "faq1": "UKSecurityJobs lists verified security vacancies across Brighton and Hove and the wider East Sussex coast. Brighton&apos;s seafront and pier venues, large volume of licensed premises and major festivals including Brighton Festival and Great Escape generate significant door supervisor and event security demand throughout the year. Retail security positions are available at Churchill Square and across the city centre. University of Brighton and University of Sussex campuses generate campus security demand. CCTV operator roles are available across the council and private sector. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is standard across Brighton&apos;s security sector. Major events operators, seafront venue managers and university campus security providers all require BS7858 compliance before officers start work. Brighton&apos;s large volume of licensed premises also sees thorough pre-employment vetting as standard practice. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Brighton or East Sussex role.",
        "nearby": [("Southampton", "security-jobs-southampton"), ("Portsmouth", "security-jobs-portsmouth"), ("London", "security-jobs-london")],
    },
    {
        "city": "Coventry",
        "slug": "security-jobs-coventry",
        "region": "West Midlands",
        "desc": "a growing security market in the West Midlands",
        "note": "Coventry&apos;s growing manufacturing sector, universities, retail centres and regeneration projects are driving increased demand for SIA-licensed security staff.",
        "sectors": "manufacturing and automotive supply chain sites, Coventry University and University of Warwick campuses, Lower Precinct and Arena Retail Park, regeneration and construction sites, and corporate offices",
        "faq1": "UKSecurityJobs lists verified security vacancies across Coventry and the West Midlands. Manufacturing and automotive supply chain security is a major sector in Coventry, with demand from JLR-adjacent industrial estates across the city. Coventry University and University of Warwick generate significant campus security demand. Retail security and CCTV operator positions are available at Lower Precinct and Arena Retail Park. Construction and regeneration site security is growing alongside Coventry&apos;s city centre renewal. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Coventry&apos;s security sector. Manufacturing employers in the automotive supply chain &mdash; including JLR-adjacent sites &mdash; enforce full BS7858 compliance for all security personnel. University security providers, retail operators and construction site security contractors also require pre-employment vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Coventry role.",
        "nearby": [("Birmingham", "security-jobs-birmingham"), ("Leicester", "security-jobs-leicester"), ("Nottingham", "security-jobs-nottingham")],
    },
    {
        "city": "Reading",
        "slug": "security-jobs-reading",
        "region": "Berkshire",
        "desc": "a strong corporate security market west of London",
        "note": "Reading&apos;s large concentration of corporate offices, retail parks and event venues makes it one of the strongest security recruitment markets in the Thames Valley corridor.",
        "sectors": "Thames Valley corporate and technology office parks, Oracle and Broad Street Mall retail, events including Reading Festival, and business district offices",
        "faq1": "UKSecurityJobs lists verified security vacancies across Reading and the Thames Valley corridor. Corporate and technology campuses &mdash; including the Oracle Corporation campus and major financial services offices &mdash; generate consistent demand for static guards, access control officers and CCTV operators. The Oracle and Broad Street Mall shopping centres require retail security and loss prevention. Events security at Reading Festival is one of the largest seasonal security recruitment requirements in the South East. Door supervisor roles are in demand across the town&apos;s night-time economy. Every vacancy requires a valid SIA licence and every employer on the platform is verified.",
        "faq3": "BS7858 vetting is required across Reading&apos;s security sector, with particular rigour from the corporate and technology employers in the Thames Valley corridor. Oracle, major financial services firms and other campus employers require full BS7858 compliance and may apply enhanced vetting for access to sensitive areas. Reading Festival&apos;s security contractors also require thorough pre-event vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Reading role, giving Berkshire employers a strong head start.",
        "nearby": [("London", "security-jobs-london"), ("Oxford", "security-jobs-oxford"), ("Milton Keynes", "security-jobs-milton-keynes")],
    },
    {
        "city": "Milton Keynes",
        "slug": "security-jobs-milton-keynes",
        "region": "Buckinghamshire",
        "desc": "a growing security market in the South Midlands",
        "note": "Milton Keynes&apos;s large distribution centres, corporate parks, shopping centres and events venues generate strong and consistent demand for SIA-licensed security professionals.",
        "sectors": "large distribution and logistics centres, Stadium MK and events venues, Xscape and major shopping centres, and corporate parks across the city",
        "faq1": "UKSecurityJobs lists verified security vacancies across Milton Keynes and Buckinghamshire. Large-scale distribution and logistics facilities &mdash; operated by Amazon, ASOS and other major e-commerce businesses &mdash; are significant employers of security guards and CCTV operators. Stadium MK and Xscape entertainment complex generate events and leisure security demand. Corporate parks across the city generate access control and static guarding roles. The city&apos;s expanding night-time economy adds door supervisor demand. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Milton Keynes&apos;s security sector. Large logistics and distribution employers are particularly thorough in their background screening, requiring full BS7858 compliance for all site security personnel. Corporate park operators and major retail destinations across the city also enforce vetting standards. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Milton Keynes role.",
        "nearby": [("London", "security-jobs-london"), ("Oxford", "security-jobs-oxford"), ("Coventry", "security-jobs-coventry")],
    },
    {
        "city": "Derby",
        "slug": "security-jobs-derby",
        "region": "East Midlands",
        "desc": "a steady security employment market in the East Midlands",
        "note": "Derby&apos;s manufacturing base, retail sector and growing city centre create reliable demand for security guards, door supervisors and CCTV operators.",
        "sectors": "Rolls-Royce and major manufacturing facilities, Intu Derby and city centre retail, corporate offices, and night-time economy venues",
        "faq1": "UKSecurityJobs lists verified security vacancies across Derby and the East Midlands. Rolls-Royce&apos;s major manufacturing campus and associated supply chain facilities are significant employers, generating demand for security officers with suitable vetting clearance. Intu Derby and city centre retail generate static guarding and CCTV operator roles. Night-time economy venues across the city centre add door supervisor demand. Corporate security roles are available across Derby&apos;s business sector. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is standard across Derby&apos;s security sector, with particular rigour from Rolls-Royce and its supply chain partners &mdash; who typically require enhanced background screening in addition to standard BS7858. Intu Derby retail security and city centre corporate employers also enforce full compliance before officers start. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Derby role.",
        "nearby": [("Nottingham", "security-jobs-nottingham"), ("Birmingham", "security-jobs-birmingham"), ("Leicester", "security-jobs-leicester")],
    },
    {
        "city": "Stoke-on-Trent",
        "slug": "security-jobs-stoke",
        "region": "Staffordshire",
        "desc": "an active security market in the West Midlands region",
        "note": "Stoke-on-Trent&apos;s large retail parks, entertainment venues and industrial estates create consistent demand for SIA-licensed security staff.",
        "sectors": "Potteries Shopping Centre, retail parks, entertainment and nightlife venues, industrial and logistics estates, and city centre premises",
        "faq1": "UKSecurityJobs lists verified security vacancies across Stoke-on-Trent and Staffordshire. The Potteries Shopping Centre and major retail parks are consistent employers of retail security and CCTV operators. Industrial and logistics sites across the city and surrounding area add static guarding demand. Night-time economy venues and licensed premises generate door supervisor roles. Corporate security is available across the city&apos;s business sector. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Stoke-on-Trent&apos;s security sector. Retail security operators, industrial site managers and major logistics employers all require full BS7858 compliance before security personnel begin work. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Stoke-on-Trent role.",
        "nearby": [("Birmingham", "security-jobs-birmingham"), ("Derby", "security-jobs-derby"), ("Coventry", "security-jobs-coventry")],
    },
    {
        "city": "Wolverhampton",
        "slug": "security-jobs-wolverhampton",
        "region": "West Midlands",
        "desc": "an active security market in the West Midlands",
        "note": "Wolverhampton&apos;s retail sector, entertainment venues and growing city centre regeneration are driving demand for experienced SIA-licensed security professionals.",
        "sectors": "Molineux Stadium and events venues, Grand Theatre and arts district, Mander Centre and city centre retail, regeneration and construction sites, and commercial properties",
        "faq1": "UKSecurityJobs lists verified security vacancies across Wolverhampton and the Black Country. Molineux Stadium &mdash; home to Wolverhampton Wanderers &mdash; and the Grand Theatre generate events security demand. Retail security roles are available at the Mander Centre and major retail parks. Construction and regeneration security is growing alongside Wolverhampton&apos;s city centre renewal programme. Night-time economy venues add door supervisor demand. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Wolverhampton&apos;s security sector. Retail security operators, venue security providers and construction site contractors all require full BS7858 compliance before officers start work. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Wolverhampton role.",
        "nearby": [("Birmingham", "security-jobs-birmingham"), ("Coventry", "security-jobs-coventry"), ("Stoke-on-Trent", "security-jobs-stoke")],
    },
    {
        "city": "Plymouth",
        "slug": "security-jobs-plymouth",
        "region": "Devon",
        "desc": "the South West&apos;s second largest security market",
        "note": "Plymouth&apos;s naval base, large retail sector, waterfront developments and active night-time economy create steady year-round demand for SIA-licensed security professionals.",
        "sectors": "HMNB Devonport and naval-adjacent facilities, city centre retail, Barbican waterfront venues, and night-time economy licensed premises",
        "faq1": "UKSecurityJobs lists verified security vacancies across Plymouth and Devon. HMNB Devonport &mdash; one of the UK&apos;s largest naval bases &mdash; and associated defence-adjacent facilities generate demand for security officers with suitable clearance and vetting. City centre retail and Barbican waterfront venues generate static guarding and door supervisor demand. The night-time economy across the city centre is active throughout the year. University of Plymouth generates campus security demand. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Plymouth&apos;s security sector. Defence-adjacent employers near HMNB Devonport apply particularly thorough background screening, often requiring enhanced DBS checks alongside standard BS7858. Retail and waterfront venue security operators and university campus providers also require full vetting compliance. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Plymouth role.",
        "nearby": [("Bristol", "security-jobs-bristol"), ("Exeter", "security-jobs-exeter"), ("Southampton", "security-jobs-southampton")],
    },
    {
        "city": "Belfast",
        "slug": "security-jobs-belfast",
        "region": "Northern Ireland",
        "desc": "Northern Ireland&apos;s largest security employment market",
        "note": "Belfast&apos;s growing economy, major retail developments, entertainment sector and corporate district are driving increasing demand for licensed security professionals.",
        "sectors": "Victoria Square and major retail, entertainment and licensed venues, Titanic Quarter corporate offices, hospitality sector, and Belfast City Airport",
        "faq1": "UKSecurityJobs lists verified security vacancies across Belfast and Northern Ireland. Victoria Square and major city centre retail generate retail security and CCTV operator demand. Titanic Quarter&apos;s expanding corporate, hospitality and tourist estate generates corporate security and access control roles. The entertainment and licensed premises sector across the Cathedral Quarter and city centre drives door supervisor demand. Belfast City Airport adds transport security roles. Every vacancy requires a valid SIA licence applicable across the United Kingdom.",
        "faq3": "BS7858 vetting is required across Belfast&apos;s security sector. Corporate employers in Titanic Quarter, major retail site security operators and city centre venue managers all require full BS7858 compliance before officers begin work. Belfast City Airport&apos;s contracted security operators apply strict pre-employment vetting timelines. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Belfast or Northern Ireland role.",
        "nearby": [("Glasgow", "security-jobs-glasgow"), ("Edinburgh", "security-jobs-edinburgh"), ("Newcastle", "security-jobs-newcastle")],
    },
    {
        "city": "Aberdeen",
        "slug": "security-jobs-aberdeen",
        "region": "Scotland",
        "desc": "a specialist security market driven by the energy sector",
        "note": "Aberdeen&apos;s energy industry, major port facilities, growing corporate sector and active city centre create consistent demand for experienced SIA-licensed security professionals.",
        "sectors": "energy sector and oil industry facilities, Aberdeen Harbour and port operations, corporate and technology offices, Union Square retail, and city centre hospitality",
        "faq1": "UKSecurityJobs lists verified security vacancies across Aberdeen and the North East of Scotland. The energy sector &mdash; including oil and gas operations, offshore support facilities and energy company offices &mdash; is the defining employer in Aberdeen, generating demand for security officers with relevant site experience and vetting. Aberdeen Harbour and port operations add maritime-adjacent security roles. Union Square and city centre retail generate retail security demand. Corporate and technology offices across the business parks add static guarding roles. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Aberdeen&apos;s security sector, with energy sector employers applying some of the most rigorous pre-employment screening in the UK &mdash; often including offshore site inductions in addition to standard BS7858. Harbour and port security operators also apply enhanced background checks. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Aberdeen role, giving North East Scotland employers a solid foundation for formal vetting.",
        "nearby": [("Edinburgh", "security-jobs-edinburgh"), ("Glasgow", "security-jobs-glasgow"), ("Newcastle", "security-jobs-newcastle")],
    },
    {
        "city": "Exeter",
        "slug": "security-jobs-exeter",
        "region": "Devon",
        "desc": "a growing security market in the South West",
        "note": "Exeter&apos;s university, retail centres, growing business district and active night-time economy support steady demand for SIA-licensed security staff.",
        "sectors": "University of Exeter campus and student venues, High Street and Princesshay retail, business district offices, and night-time economy",
        "faq1": "UKSecurityJobs lists verified security vacancies across Exeter and Devon. University of Exeter&apos;s large campus generates significant demand for campus security and student accommodation guarding. Princesshay and the High Street retail corridor require retail security and loss prevention. The city centre&apos;s growing business district adds corporate security and access control roles. Night-time economy venues generate door supervisor demand. Exeter has a strong tourist season, with heritage sites and summer events adding further security requirements. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Exeter&apos;s security sector. University of Exeter campus security providers and corporate business district employers require full BS7858 compliance. Retail security operators at Princesshay also require pre-employment vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Exeter role.",
        "nearby": [("Bristol", "security-jobs-bristol"), ("Plymouth", "security-jobs-plymouth"), ("Southampton", "security-jobs-southampton")],
    },
    {
        "city": "Oxford",
        "slug": "security-jobs-oxford",
        "region": "Oxfordshire",
        "desc": "a specialist security market with strong corporate demand",
        "note": "Oxford&apos;s world-famous university estates, research facilities, corporate sector and busy city centre create consistent demand for professional, experienced security officers.",
        "sectors": "University of Oxford estates and research facilities, Westgate and city centre retail, corporate and biomedical sector offices at Oxford Science Park, and tourist and heritage sites",
        "faq1": "UKSecurityJobs lists verified security vacancies across Oxford and Oxfordshire. The University of Oxford&apos;s vast estate &mdash; covering colleges, research departments, libraries and museums &mdash; generates consistent demand for experienced, professional security officers with a strong customer service approach. Westgate Oxford is the city&apos;s primary retail security employer. The biomedical and technology sector at Oxford Science Park and Harwell Campus adds demand for corporate and specialist site security. Heritage sites and high volumes of tourists add further security requirements year-round. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Oxford&apos;s security sector, with University of Oxford college and department security providers among the most thorough in applying the standard &mdash; some requiring enhanced DBS checks for access to sensitive research facilities. Westgate retail security, biomedical campus operators and corporate office managers across the city also enforce full BS7858 compliance. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Oxford role.",
        "nearby": [("London", "security-jobs-london"), ("Reading", "security-jobs-reading"), ("Birmingham", "security-jobs-birmingham")],
    },
    {
        "city": "Cambridge",
        "slug": "security-jobs-cambridge",
        "region": "Cambridgeshire",
        "desc": "a growing security market driven by tech and academia",
        "note": "Cambridge&apos;s university estates, research parks, growing tech sector and city centre venues generate strong demand for SIA-licensed security professionals.",
        "sectors": "University of Cambridge estates and colleges, Cambridge Science Park and tech sector offices, Grand Arcade retail, and city centre venues",
        "faq1": "UKSecurityJobs lists verified security vacancies across Cambridge and Cambridgeshire. The University of Cambridge&apos;s colleges and research departments require professional, customer-focused security officers. Cambridge Science Park &mdash; home to major technology and biomedical companies &mdash; generates demand for specialist site security and access control. Retail security roles are available at the Grand Arcade and city centre. The city&apos;s night-time economy and student venues add door supervisor demand. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across Cambridge&apos;s security sector. University of Cambridge security providers and technology and biomedical employers at Cambridge Science Park apply rigorous pre-employment vetting, sometimes requiring enhanced checks for access to sensitive research areas. Retail operators and city centre venue managers also require full BS7858 compliance. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any Cambridge role.",
        "nearby": [("London", "security-jobs-london"), ("Milton Keynes", "security-jobs-milton-keynes"), ("Reading", "security-jobs-reading")],
    },
    {
        "city": "York",
        "slug": "security-jobs-york",
        "region": "North Yorkshire",
        "desc": "a specialist security market in North Yorkshire",
        "note": "York&apos;s major tourist industry, historic venues, retail sector and active night-time economy create year-round demand for experienced, customer-focused security professionals.",
        "sectors": "York Minster and heritage tourist attractions, the Shambles and city centre retail, York Racecourse events, hospitality venues, and night-time economy",
        "faq1": "UKSecurityJobs lists verified security vacancies across York and North Yorkshire. York Minster, the Shambles and the city&apos;s extensive heritage attractions generate security roles requiring professional, tourist-facing officers with strong customer service skills. York Racecourse is one of the UK&apos;s most prestigious venues, generating significant event security demand across its busy flat season. The Coppergate Centre and city centre retail generate retail security demand. York&apos;s growing night-time economy and University of York campus add further security requirements. Every vacancy requires a valid SIA licence.",
        "faq3": "BS7858 vetting is required across York&apos;s security sector. York Racecourse&apos;s event security operators, heritage site security providers and city centre retail operators all require full BS7858 compliance before officers start work. University of York campus security also requires pre-employment vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any York role.",
        "nearby": [("Leeds", "security-jobs-leeds"), ("Newcastle", "security-jobs-newcastle"), ("Sheffield", "security-jobs-sheffield")],
    },
]

# ── City link grid (shared across all pages) ─────────────────────────────────
CITY_LINKS = '\n'.join(
    f'      <a href="/{c["slug"]}" class="city-link">{c["city"]}</a>'
    for c in cities
)

# ── HTML template ──────────────────────────────────────────────────────────────
# Variables: {city} {slug} {region} {desc} {note} {sectors}
#            {faq1} {faq3} {nearby_links} {city_links}

TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Security Jobs {city} &mdash; SIA Licensed Vacancies | UKSecurityJobs</title>
<meta name="description" content="Find verified security jobs in {city}. Every role requires a valid SIA licence. Register free, build your BS7858-ready profile and apply to verified {region} security employers."/>
<link rel="canonical" href="https://www.uksecurityjobs.co.uk/{slug}"/>
<script type="application/ld+json">{{
  "@context":"https://schema.org",
  "@type":"JobPosting",
  "title":"Security Officer &mdash; {city}",
  "description":"SIA-licensed security officer positions in {city}, {region}",
  "hiringOrganization":{{"@type":"Organization","name":"UKSecurityJobs","sameAs":"https://www.uksecurityjobs.co.uk"}},
  "jobLocation":{{"@type":"Place","address":{{"@type":"PostalAddress","addressLocality":"{city}","addressRegion":"{region}","addressCountry":"GB"}}}},
  "employmentType":"FULL_TIME"
}}</script>
<script type="application/ld+json">{{
  "@context":"https://schema.org",
  "@type":"FAQPage",
  "mainEntity":[
    {{"@type":"Question","name":"What security jobs are available in {city}?","acceptedAnswer":{{"@type":"Answer","text":"UKSecurityJobs lists verified security vacancies in {city} across {sectors}. Roles include door supervisor positions, security guard roles, CCTV operator jobs and close protection opportunities. Every role requires a valid SIA licence."}}}},
    {{"@type":"Question","name":"Do I need an SIA licence to work as a security officer in {city}?","acceptedAnswer":{{"@type":"Answer","text":"Yes. All front-line security roles in the UK require a valid SIA licence issued by the Security Industry Authority. Depending on the role, you will need a Door Supervisor, Security Guard, CCTV Operator or Close Protection licence. UKSecurityJobs verifies every candidate licence before their profile goes live to employers."}}}},
    {{"@type":"Question","name":"What is BS7858 vetting and do I need it for security jobs in {city}?","acceptedAnswer":{{"@type":"Answer","text":"BS7858 is the British Standard for vetting individuals working in security environments. It requires a verified 5-year employment and address history with no unexplained gaps. Most security employers in {city} require BS7858 vetting. UKSecurityJobs candidates complete their full BS7858-ready profile before applying for any role."}}}},
    {{"@type":"Question","name":"How do I register for security jobs in {city}?","acceptedAnswer":{{"@type":"Answer","text":"Register free at UKSecurityJobs, complete your BS7858-ready profile including your SIA licence details, employment history, address history and reference contacts. Your licence will be verified within 24 hours. Once verified, you can apply for security vacancies in {city} and across the UK with a single click."}}}}
  ]
}}</script>
<style>
*{{box-sizing:border-box;margin:0;padding:0;}}
:root{{--blue:#1a52a8;--navy:#0b1222;--border:#e2e8f0;--off:#f9fafb;--mid:#4a5568;}}
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:var(--navy);background:#fff;-webkit-font-smoothing:antialiased;}}
a{{color:var(--blue);text-decoration:none;}}a:hover{{text-decoration:underline;}}
.nav{{background:#fff;border-bottom:1px solid var(--border);height:64px;display:flex;align-items:center;position:sticky;top:0;z-index:100;}}
.nav-inner{{max-width:1160px;margin:0 auto;width:100%;padding:0 2rem;display:flex;align-items:center;justify-content:space-between;}}
.logo{{font-size:1.15rem;font-weight:800;text-decoration:none;}}
.logo .uk{{color:var(--blue);}}.logo .sec{{color:var(--navy);}}.logo .job{{color:var(--blue);}}
.nav-links{{display:flex;align-items:center;gap:1.5rem;}}
.nav-link{{font-size:0.88rem;font-weight:500;color:var(--mid);text-decoration:none;}}
.nav-cta{{background:var(--navy);color:#fff;font-size:0.85rem;font-weight:700;padding:0.55rem 1.25rem;border-radius:8px;text-decoration:none;}}
.nav-cta:hover{{background:#1e293b;text-decoration:none;}}
.hero{{background:var(--navy);padding:4rem 2rem;color:#fff;}}
.hero-inner{{max-width:860px;margin:0 auto;}}
.hero-tag{{display:inline-block;background:rgba(26,82,168,0.4);color:#93c5fd;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;padding:0.3rem 0.875rem;border-radius:999px;margin-bottom:1.25rem;border:1px solid rgba(26,82,168,0.5);}}
.hero h1{{font-size:2.5rem;font-weight:900;line-height:1.12;letter-spacing:-0.03em;margin-bottom:1rem;}}
.hero p{{font-size:1rem;color:#94a3b8;line-height:1.75;max-width:640px;margin-bottom:1.75rem;}}
.live-count{{font-size:0.82rem;color:#93c5fd;margin-top:-1rem;margin-bottom:1.5rem;min-height:1.2em;}}
.hero-btns{{display:flex;flex-wrap:wrap;gap:0.875rem;}}
.btn-primary{{display:inline-block;background:#1a52a8;color:#fff;font-size:0.92rem;font-weight:700;padding:0.8rem 2rem;border-radius:9px;text-decoration:none;}}
.btn-primary:hover{{background:#164187;text-decoration:none;}}
.btn-secondary{{display:inline-block;background:rgba(255,255,255,0.08);color:#fff;font-size:0.92rem;font-weight:600;padding:0.8rem 2rem;border-radius:9px;text-decoration:none;border:1px solid rgba(255,255,255,0.15);}}
.btn-secondary:hover{{background:rgba(255,255,255,0.14);text-decoration:none;}}
.badges{{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1.5rem;}}
.badge{{font-size:0.72rem;font-weight:600;padding:0.3rem 0.75rem;border-radius:999px;background:rgba(26,82,168,0.3);color:#93c5fd;border:1px solid rgba(26,82,168,0.5);}}
.section{{padding:4rem 2rem;}}
.section-inner{{max-width:1100px;margin:0 auto;}}
.section-inner.narrow{{max-width:800px;}}
.section-tag{{font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:var(--blue);margin-bottom:0.75rem;}}
.section h2{{font-size:1.75rem;font-weight:900;letter-spacing:-0.02em;margin-bottom:1rem;}}
.section p{{font-size:0.93rem;color:var(--mid);line-height:1.8;margin-bottom:0.875rem;}}
.cards{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.25rem;margin-top:2rem;}}
.card{{background:var(--off);border-radius:12px;padding:1.5rem;border:1px solid var(--border);}}
.card-icon{{width:40px;height:40px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;}}
.card h3{{font-size:0.95rem;font-weight:700;margin-bottom:0.4rem;}}
.card p{{font-size:0.8rem;color:var(--mid);line-height:1.65;margin:0;}}
.card a{{display:inline-block;margin-top:0.75rem;font-size:0.78rem;font-weight:600;color:var(--blue);}}
.nearby-links{{margin-top:1.75rem;font-size:0.85rem;color:var(--mid);}}
.nearby-links a{{color:var(--blue);font-weight:600;text-decoration:none;}}
.nearby-links a:hover{{text-decoration:underline;}}
.links-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;margin-top:1.5rem;}}
.city-link{{background:var(--off);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;font-size:0.82rem;font-weight:600;color:var(--navy);text-decoration:none;transition:border-color 0.15s;}}
.city-link:hover{{border-color:var(--blue);color:var(--blue);text-decoration:none;}}
.faq{{padding:4rem 2rem;background:var(--off);}}
.faq-inner{{max-width:800px;margin:0 auto;}}
.faq h2{{font-size:1.75rem;font-weight:900;margin-bottom:2rem;letter-spacing:-0.02em;}}
.faq-item{{border-bottom:1px solid var(--border);}}
.faq-item:last-child{{border-bottom:none;}}
.faq-q{{width:100%;background:none;border:none;text-align:left;padding:1.1rem 0;font-size:0.95rem;font-weight:700;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:1rem;font-family:inherit;}}
.faq-q:hover{{color:var(--blue);}}
.faq-icon{{flex-shrink:0;font-size:1.25rem;color:#94a3b8;transition:transform 0.2s;}}
.faq-a{{display:none;padding:0 0 1.1rem;font-size:0.88rem;color:var(--mid);line-height:1.75;}}
.faq-item.open .faq-a{{display:block;}}
.faq-item.open .faq-icon{{transform:rotate(45deg);}}
.cta{{background:var(--navy);padding:4rem 2rem;text-align:center;color:#fff;}}
.cta h2{{font-size:2rem;font-weight:900;margin-bottom:0.75rem;}}
.cta p{{color:#94a3b8;margin-bottom:2rem;font-size:0.95rem;}}
footer{{background:#0b1222;padding:4rem 2rem 2rem;}}
footer *{{box-sizing:border-box;}}
.foot-wrap{{max-width:1160px;margin:0 auto;}}
.foot-top{{display:grid;grid-template-columns:240px 1fr;gap:4rem;padding-bottom:3rem;border-bottom:1px solid #1e293b;margin-bottom:2rem;}}
.foot-brand p{{font-size:0.8rem;color:#475569;line-height:1.75;margin-top:0.75rem;max-width:210px;}}
.foot-logo{{font-size:1.1rem;font-weight:800;text-decoration:none;display:inline-block;}}
.foot-logo .uk{{color:#1a52a8;}}.foot-logo .sec{{color:#fff;}}.foot-logo .job{{color:#1a52a8;}}
footer nav{{background:transparent;border:none;height:auto;position:static;backdrop-filter:none;display:block;}}
.foot-nav{{display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;align-items:start;}}
.foot-col h4{{font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:#334155;margin-bottom:0.875rem;display:block;}}
.foot-col a{{display:block;font-size:0.82rem;color:#64748b;margin-bottom:0.5rem;text-decoration:none;transition:color 0.15s;}}
.foot-col a:hover{{color:#fff;}}
.foot-bottom{{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;}}
.foot-copy{{font-size:0.72rem;color:#334155;}}
.foot-legal{{display:flex;gap:1.25rem;}}
.foot-legal a{{font-size:0.72rem;color:#334155;text-decoration:none;}}
.foot-legal a:hover{{color:#94a3b8;}}
@media(max-width:900px){{.hero h1{{font-size:1.85rem;}}.cards{{grid-template-columns:1fr 1fr;}}.foot-top{{grid-template-columns:1fr;gap:2rem;}}.foot-nav{{grid-template-columns:repeat(2,1fr);}}}}
@media(max-width:600px){{.cards{{grid-template-columns:1fr;}}.links-grid{{grid-template-columns:repeat(2,1fr);}}.foot-nav{{grid-template-columns:1fr;}}}}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="logo"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a>
    <div class="nav-links">
      <a class="nav-link" href="/vacancies">Vacancies</a>
      <a class="nav-link" href="/security-salary-guide">Salary Guide</a>
      <a class="nav-link" href="/blog">Blog</a>
      <a class="nav-cta" href="/officers">Candidate Registration</a>
      <a class="nav-cta" href="/employers" style="background:#1a52a8;margin-left:0.5rem;">Company Registration</a>
    </div>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <span class="hero-tag">SIA Licensed Roles &middot; {region}</span>
    <h1>Security Jobs in {city}</h1>
    <p>UKSecurityJobs lists verified security vacancies in {city} &mdash; {desc}. Every role requires a valid SIA licence. Register once and apply to multiple {city} employers without filling in another application form.</p>
    <p class="live-count" id="live-count"></p>
    <div class="hero-btns">
      <a href="https://app.uksecurityjobs.co.uk/sign-up" class="btn-primary">Register Free &rarr;</a>
      <a href="https://app.uksecurityjobs.co.uk/jobs" class="btn-secondary">View Current Jobs</a>
    </div>
    <div class="badges">
      <span class="badge">SIA Licence Verified</span>
      <span class="badge">BS7858 Ready</span>
      <span class="badge">5-Year History Checked</span>
      <span class="badge">No Time Wasters</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="section-inner">
    <div class="section-tag">Security Jobs in {city}</div>
    <h2>Why Security Work in {city}?</h2>
    <p>{note}</p>
    <p>Every vacancy listed on UKSecurityJobs requires a valid SIA licence. Employers on this platform have been verified before they can post a role &mdash; and every candidate has a complete, BS7858-ready profile including verified employment history, full address history and reference contacts ready to go.</p>
    <div class="cards">
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
        <h3>Door Supervisor Jobs {city}</h3>
        <p>Licensed premises, events and retail security roles requiring an SIA Door Supervisor licence.</p>
        <a href="/door-supervisor-jobs">View Door Supervisor roles &rarr;</a>
      </div>
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h3>Security Guard Jobs {city}</h3>
        <p>Static guarding, corporate, retail and construction site roles requiring an SIA Security Guard licence.</p>
        <a href="/security-guard-jobs">View Security Guard roles &rarr;</a>
      </div>
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
        <h3>CCTV Operator Jobs {city}</h3>
        <p>Control room and public space surveillance roles requiring an SIA CCTV (PSS) licence.</p>
        <a href="/cctv-jobs">View CCTV Operator roles &rarr;</a>
      </div>
      <div class="card">
        <div class="card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a52a8" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg></div>
        <h3>Close Protection Jobs {city}</h3>
        <p>Personal protection and specialist security roles requiring an SIA Close Protection licence.</p>
        <a href="/close-protection-jobs">View Close Protection roles &rarr;</a>
      </div>
    </div>
    <p class="nearby-links">Also see security jobs near {city}: {nearby_links}</p>
  </div>
</section>

<section class="section" style="background:var(--off);">
  <div class="section-inner narrow">
    <div class="section-tag">Other Locations</div>
    <h2>Security Jobs Across the UK</h2>
    <p>UKSecurityJobs covers security vacancies across the entire United Kingdom. Browse verified security jobs in other cities and regions:</p>
    <div class="links-grid">
{city_links}
    </div>
  </div>
</section>

<section class="faq">
  <div class="faq-inner">
    <h2>Security Jobs in {city} &mdash; Frequently Asked Questions</h2>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">What security jobs are available in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">{faq1}</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">Do I need an SIA licence to work as a security officer in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">Yes. All front-line security roles in the UK require a valid SIA licence issued by the Security Industry Authority. Depending on the role, you will need a Door Supervisor, Security Guard, CCTV Operator (PSS) or Close Protection licence. UKSecurityJobs verifies every candidate&apos;s licence against the public SIA register before their profile goes live to employers.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">What does BS7858 vetting involve for security jobs in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">{faq3}</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">How much do security jobs pay in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">Security pay rates in {city} vary by role, employer, shift pattern and experience level. Every job listing on UKSecurityJobs displays the pay rate before you apply &mdash; there are no hidden rates or bait-and-switch listings. For a full breakdown of current rates by licence type and region, see the <a href="/security-salary-guide">UKSecurityJobs Salary Guide</a>.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">How do I register for security jobs in {city}?<span class="faq-icon">+</span></button>
      <div class="faq-a">Register free at UKSecurityJobs and complete your profile &mdash; it takes approximately 20 minutes and covers your SIA licence details, employment history, address history and reference contacts. Your SIA licence will be verified within 24 hours. Once verified, you can apply for security vacancies in {city} and anywhere in the UK with a single click, without having to fill in another application form.</div>
    </div>

    <div class="faq-item">
      <button class="faq-q" onclick="toggle(this)">Can security companies in {city} post jobs on UKSecurityJobs?<span class="faq-icon">+</span></button>
      <div class="faq-a">Yes. Security companies in {city} and across the UK can register as employers and post verified security vacancies on the platform. All applications come from SIA-licensed, BS7858-ready candidates &mdash; no unsuitable applicants, no unlicensed candidates and no time wasters. <a href="/employers">Register your company here</a>.</div>
    </div>

  </div>
</section>

<section class="cta">
  <h2>Find Your Next Security Role in {city}</h2>
  <p>Register free. SIA licence verified within 24 hours. Apply to verified employers with one click.</p>
  <a href="https://app.uksecurityjobs.co.uk/sign-up" style="display:inline-block;background:#fff;color:var(--navy);font-size:0.95rem;font-weight:700;padding:0.875rem 2.25rem;border-radius:10px;text-decoration:none;">Create My Profile &rarr;</a>
</section>

<footer>
  <div class="foot-wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <a href="/" class="foot-logo"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a>
        <p>The UK&apos;s only verified security jobs platform. Built by the industry, for the industry.</p>
        <p style="margin-top:0.5rem;font-size:0.75rem;color:#334155;">Digital Software Group Ltd<br>Registered in England &amp; Wales</p>
      </div>
      <nav class="foot-nav">
        <div class="foot-col">
          <h4>Security Officers</h4>
          <a href="/officers">For Security Officers</a>
          <a href="https://app.uksecurityjobs.co.uk/sign-up">Register Free</a>
          <a href="https://app.uksecurityjobs.co.uk/jobs">Security Jobs</a>
          <a href="https://app.uksecurityjobs.co.uk/sign-in">Sign In</a>
        </div>
        <div class="foot-col">
          <h4>Security Companies</h4>
          <a href="/employers">For Employers</a>
          <a href="https://app.uksecurityjobs.co.uk/employer/sign-up">Register a Company</a>
          <a href="https://app.uksecurityjobs.co.uk/sign-in">Employer Sign In</a>
        </div>
        <div class="foot-col">
          <h4>SIA Job Types</h4>
          <a href="/door-supervisor-jobs">Door Supervisor Jobs</a>
          <a href="/cctv-jobs">CCTV Operator Jobs</a>
          <a href="/close-protection-jobs">Close Protection Jobs</a>
          <a href="/security-guard-jobs">Security Guard Jobs</a>
        </div>
        <div class="foot-col">
          <h4>Company</h4>
          <a href="/blog">Blog</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="mailto:support@uksecurityjobs.co.uk">Contact Us</a>
        </div>
      </nav>
    </div>
    <div class="foot-bottom">
      <p class="foot-copy">&copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd. All rights reserved.</p>
      <div class="foot-legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/cookies">Cookies</a>
      </div>
    </div>
  </div>
</footer>

<script>
function toggle(btn) {{
  var item = btn.parentElement;
  item.classList.toggle('open');
}}

(function() {{
  var city = '{city}';
  var el = document.getElementById('live-count');
  if (!el) return;
  fetch('https://uksecurityjobs-api.onrender.com/api/jobs/public')
    .then(function(r) {{ return r.json(); }})
    .then(function(data) {{
      var jobs = (data.jobs || []).filter(function(j) {{
        return j.location && j.location.toLowerCase().indexOf(city.toLowerCase()) !== -1;
      }});
      if (jobs.length === 0) {{
        el.textContent = 'No live vacancies in {city} right now \u2014 register to be first when roles are posted.';
      }} else {{
        el.textContent = jobs.length + ' live ' + (jobs.length === 1 ? 'vacancy' : 'vacancies') + ' in {city} right now.';
      }}
    }})
    .catch(function() {{ el.textContent = ''; }});
}})();
</script>

<script src="/footer-extras.js" defer></script>
</body>
</html>'''


# ── Generate pages ─────────────────────────────────────────────────────────────
count = 0
for c in cities:
    nearby_html = ' &middot; '.join(
        f'<a href="/{slug}">{name}</a>'
        for name, slug in c.get('nearby', [])
    )
    html = TEMPLATE.format(
        city=c['city'],
        slug=c['slug'],
        region=c['region'],
        desc=c['desc'],
        note=c['note'],
        sectors=c['sectors'],
        faq1=c['faq1'],
        faq3=c['faq3'],
        nearby_links=nearby_html,
        city_links=CITY_LINKS,
    )
    fname = os.path.join(OUT_DIR, f"{c['slug']}.html")
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(html)
    count += 1
    print(f"Created: {c['slug']}.html")

print(f"\nTotal: {count} pages generated")
