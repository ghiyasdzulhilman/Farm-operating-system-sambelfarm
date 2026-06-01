# 🚜 SambelFarm - Farm Management Platform

SambelFarm adalah sistem ERP internal berbasis web untuk manajemen operasional dan keuangan kebun. Sistem ini menggunakan React di Frontend dan Express di Backend, serta diintegrasikan langsung dengan **Notion API** sebagai database utama.

---

## 🗺️ 1. PETA ALUR SISTEM (Structural View)
Diagram di bawah ini memetakan bagaimana komponen Frontend, Backend, Database, dan Notion saling terhubung secara fisik dan logis.

```mermaid
flowchart TD
    %% USER LAYER
    U[👤 User / Mandor]

    %% FRONTEND
    subgraph FE["📱 Frontend — React 19 + Vite + Wouter"]
        HOME["Home Page"]
        DASH["Dashboard"]
        CONNECT["Notion Connect"]
        SETTINGS["Field Mapping Settings"]
        FORMS["Panen / Pengeluaran / Perawatan Forms"]
        STAGING["Staging Queue UI"]
        APIHOOKS["Generated API Hooks (Orval)"]
    end

    %% AUTH
    subgraph AUTH["🔐 Authentication"]
        CLERK["Clerk Auth"]
    end

    %% BACKEND
    subgraph BE["⚙️ Backend — Express 5 API Server"]
        ROUTER["Route Layer"]
        subgraph ROUTES["API Routes"]
            NOTIONR["/notion/*"]
            DASHR["/dashboard/*"]
            MAPR["/mappings/*"]
            HARVESTR["/harvest/*"]
            EXPENSER["/expenses/*"]
            PERAWATANR["/perawatan/*"]
            OPERASIONALR["/operasional/*"]
        end
        VALIDATION["Zod Validation"]
        SERVICES["Business Logic Services"]
        CACHE["Notion Cache Layer"]
        NOTIONCLIENT["Notion Client"]
    end

    %% DATABASE
    subgraph DB["🗄️ PostgreSQL + Drizzle ORM"]
        NC["notion_connections"]
        OS["oauth_states"]
        FM["field_mappings"]
        SD["staging_data"]
    end

    %% EXTERNAL SERVICES
    subgraph EXT["☁️ External Services"]
        NOTION["Notion API"]
    end

    %% ALUR HUBUNGAN
    U --> HOME & DASH & CONNECT & SETTINGS & FORMS & STAGING
    HOME & DASH & CONNECT & SETTINGS & FORMS --> CLERK
    DASH & CONNECT & SETTINGS & FORMS & STAGING --> APIHOOKS
    APIHOOKS --> ROUTER

    ROUTER --> NOTIONR & DASHR & MAPR & HARVESTR & EXPENSER & PERAWATANR & OPERASIONALR
    NOTIONR & DASHR & MAPR & HARVESTR & EXPENSER & PERAWATANR & OPERASIONALR --> VALIDATION
    VALIDATION --> SERVICES

    SERVICES --> NC & OS & FM & SD
    SERVICES --> CACHE
    CACHE --> NOTIONCLIENT
    NOTIONCLIENT --> NOTION
```

---

## ⏱️ 2. KRONOLOGI ALUR DATA (Sequence View)
Diagram di bawah ini merincikan urutan kejadian detik per detik dari setiap fitur utama aplikasi.

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant FE as React Frontend
    participant Clerk as Clerk Auth
    participant API as Express API
    participant Zod as Zod Validation
    participant Service as Business Services
    participant Cache as Notion Cache
    participant DB as PostgreSQL/Drizzle
    participant Notion as Notion API

    Note over User,Notion: 1. Login & Authentication Flow
    User->>FE: Open Application
    FE->>Clerk: Authenticate User
    Clerk-->>FE: Session + JWT
    FE-->>User: Authenticated Dashboard

    Note over User,Notion: 2. Notion Workspace Connection
    User->>FE: Connect Notion
    FE->>API: POST /notion/connect
    API->>DB: Create OAuth State
    DB-->>API: State Saved
    API-->>FE: Notion OAuth URL
    FE->>Notion: Redirect User
    User->>Notion: Authorize Access
    Notion->>API: OAuth Callback
    API->>DB: Validate OAuth State
    DB-->>API: State Valid
    API->>Notion: Exchange Code for Token
    Notion-->>API: Access Token
    API->>DB: Save notion_connections
    DB-->>API: Saved
    API-->>FE: Connection Success
    FE-->>User: Workspace Connected

    Note over User,Notion: 3. Database Discovery & Field Mapping
    User->>FE: Open Settings
    FE->>API: GET /notion/list-databases
    API->>DB: Get User Token
    DB-->>API: Token
    API->>Notion: Search Databases
    Notion-->>API: Database List
    API-->>FE: Database List
    User->>FE: Select Database
    FE->>API: GET /inspect-database
    API->>Notion: Get Database Schema
    Notion-->>API: Properties
    API-->>FE: Available Fields
    User->>FE: Configure Mapping
    FE->>API: POST /field-mappings
    API->>DB: Save field_mappings
    DB-->>API: Mapping Saved
    API-->>FE: Success

    Note over User,Notion: 4. Panen / Pengeluaran / Perawatan / Operasional
    User->>FE: Submit Form
    FE->>API: POST Module Data
    API->>Zod: Validate Payload
    alt Validation Failed
        Zod-->>API: Error
        API-->>FE: Validation Error
        FE-->>User: Show Error
    else Validation Passed
        Zod-->>API: Valid Payload
        API->>DB: Load Mapping
        DB-->>API: Mapping
        API->>Service: Build Notion Payload
        Service->>DB: Load User Token
        DB-->>Service: Token
        Service->>Notion: Create Page
        Notion-->>Service: Page Created
        Service-->>API: Success
        API-->>FE: Success Response
        FE-->>User: Data Saved
    end

    Note over User,Notion: 5. Staging Queue Flow
    User->>FE: Save Draft/Staging
    FE->>API: POST /staging/save
    API->>DB: Insert staging_data
    DB-->>API: Saved
    API-->>FE: Pending Sync
    User->>FE: Open Staging Queue
    FE->>API: GET /staging
    API->>DB: Load staging_data
    DB-->>API: Pending Records
    API-->>FE: Queue Items
    User->>FE: Sync Record
    FE->>API: POST /staging/sync
    API->>DB: Load Staging Data
    DB-->>API: Payload
    API->>Service: Convert To Notion Format
    Service->>Notion: Create Page
    alt Sync Success
        Notion-->>Service: Created
        Service->>DB: Mark Synced
        DB-->>Service: Updated
        Service-->>API: Success
        API-->>FE: Synced
        FE-->>User: Sync Complete
    else Sync Failed
        Notion-->>Service: Error
        Service->>DB: Keep Pending
        DB-->>Service: Pending
        API-->>FE: Sync Failed
        FE-->>User: Retry Later
    end
```
