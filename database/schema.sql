-- Hawker eMenu database schema (Microsoft SQL Server)
-- Run this on an empty database called HawkerEMenu, then run seed.sql.

-- ---------- People ----------
CREATE TABLE Users (
    UserId        INT IDENTITY(1,1) PRIMARY KEY,
    Name          NVARCHAR(100) NOT NULL,
    Email         NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash  NVARCHAR(255) NOT NULL,
    Role          NVARCHAR(20)  NOT NULL DEFAULT 'customer'
                  CHECK (Role IN ('customer', 'vendor', 'admin')),
    Points        INT           NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

-- ---------- Places ----------
CREATE TABLE HawkerCentres (
    CentreId  INT IDENTITY(1,1) PRIMARY KEY,
    Name      NVARCHAR(100) NOT NULL,
    Address   NVARCHAR(255) NULL
);

-- Where customers pick up orders from one or more stalls
CREATE TABLE CollectionPoints (
    PointId      INT IDENTITY(1,1) PRIMARY KEY,
    CentreId     INT NOT NULL REFERENCES HawkerCentres(CentreId),
    Name         NVARCHAR(50)  NOT NULL,          -- e.g. 'Collection Point A'
    Description  NVARCHAR(255) NULL               -- e.g. 'Beside Stall #01-12'
);

CREATE TABLE Stalls (
    StallId          INT IDENTITY(1,1) PRIMARY KEY,
    CentreId         INT NOT NULL REFERENCES HawkerCentres(CentreId),
    OwnerUserId      INT NULL REFERENCES Users(UserId),
    Name             NVARCHAR(100) NOT NULL,
    Cuisine          NVARCHAR(50)  NULL,
    UnitNo           NVARCHAR(20)  NULL,          -- e.g. '#01-12'
    AcceptsCdc       BIT NOT NULL DEFAULT 0,
    IsOpen           BIT NOT NULL DEFAULT 1,
    DefaultPhotoUrl  NVARCHAR(500) NULL           -- shown before any dish has uploads
);

CREATE TABLE MenuItems (
    ItemId       INT IDENTITY(1,1) PRIMARY KEY,
    StallId      INT NOT NULL REFERENCES Stalls(StallId),
    Name         NVARCHAR(100) NOT NULL,
    Description  NVARCHAR(255) NULL,
    Price        DECIMAL(6,2)  NOT NULL CHECK (Price >= 0),
    IsSoldOut    BIT NOT NULL DEFAULT 0
);

-- ---------- Photos & votes ----------
CREATE TABLE Photos (
    PhotoId      INT IDENTITY(1,1) PRIMARY KEY,
    ItemId       INT NOT NULL REFERENCES MenuItems(ItemId),
    UserId       INT NOT NULL REFERENCES Users(UserId),
    ImageUrl     NVARCHAR(500) NOT NULL,
    AiCheck      NVARCHAR(20)  NOT NULL DEFAULT 'pending'
                 CHECK (AiCheck IN ('pending', 'passed', 'rejected')),
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

-- The composite primary key enforces ONE vote per user per photo
CREATE TABLE Votes (
    UserId     INT NOT NULL REFERENCES Users(UserId),
    PhotoId    INT NOT NULL REFERENCES Photos(PhotoId),
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (UserId, PhotoId)
);

-- ---------- Orders ----------
CREATE TABLE Orders (
    OrderId      INT IDENTITY(1,1) PRIMARY KEY,
    UserId       INT NOT NULL REFERENCES Users(UserId),
    PointId      INT NOT NULL REFERENCES CollectionPoints(PointId),
    PickupTime   DATETIME2 NULL,                  -- NULL = as soon as possible
    Status       NVARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                 CHECK (Status IN ('pending_payment', 'paid', 'preparing', 'ready', 'collected', 'cancelled')),
    TotalAmount  DECIMAL(8,2) NOT NULL,
    NetsTxnRef   NVARCHAR(100) NULL,
    IsUsual      BIT NOT NULL DEFAULT 0,          -- "save as my usual"
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- One order can hold items from several stalls; each stall marks its own items ready
CREATE TABLE OrderItems (
    OrderItemId  INT IDENTITY(1,1) PRIMARY KEY,
    OrderId      INT NOT NULL REFERENCES Orders(OrderId),
    ItemId       INT NOT NULL REFERENCES MenuItems(ItemId),
    Quantity     INT NOT NULL CHECK (Quantity > 0),
    UnitPrice    DECIMAL(6,2) NOT NULL,           -- price at time of order
    ItemStatus   NVARCHAR(20) NOT NULL DEFAULT 'preparing'
                 CHECK (ItemStatus IN ('preparing', 'ready'))
);
GO

-- ---------- Views ----------
-- Top photo per dish: most votes wins, earliest upload breaks ties.
-- Only photos that passed the AI food check are eligible.
CREATE VIEW TopPhotos AS
WITH Ranked AS (
    SELECT p.PhotoId, p.ItemId, p.ImageUrl, p.UserId, p.CreatedAt,
           COUNT(v.PhotoId) AS VoteCount,
           ROW_NUMBER() OVER (
               PARTITION BY p.ItemId
               ORDER BY COUNT(v.PhotoId) DESC, p.CreatedAt ASC
           ) AS RankNo
    FROM Photos p
    LEFT JOIN Votes v ON v.PhotoId = p.PhotoId
    WHERE p.AiCheck = 'passed'
    GROUP BY p.PhotoId, p.ItemId, p.ImageUrl, p.UserId, p.CreatedAt
)
SELECT PhotoId, ItemId, ImageUrl, UserId, VoteCount
FROM Ranked
WHERE RankNo = 1;
GO

-- Live queue: paid orders each stall is still preparing
CREATE VIEW StallQueue AS
SELECT s.StallId,
       COUNT(DISTINCT o.OrderId) AS OrdersAhead
FROM Stalls s
LEFT JOIN MenuItems m  ON m.StallId = s.StallId
LEFT JOIN OrderItems oi ON oi.ItemId = m.ItemId AND oi.ItemStatus = 'preparing'
LEFT JOIN Orders o     ON o.OrderId = oi.OrderId AND o.Status IN ('paid', 'preparing')
GROUP BY s.StallId;
GO
