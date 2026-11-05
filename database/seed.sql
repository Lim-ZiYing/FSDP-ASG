-- Sample data for development. Stall names and prices are examples.

INSERT INTO HawkerCentres (Name, Address)
VALUES ('Maxwell Food Centre', '1 Kadayanallur Street, Singapore 069184');

INSERT INTO CollectionPoints (CentreId, Name, Description)
VALUES (1, 'Collection Point A', 'Beside Stall #01-12'),
       (1, 'Collection Point B', 'Near the main entrance');

INSERT INTO Stalls (CentreId, Name, Cuisine, UnitNo, AcceptsCdc)
VALUES (1, 'Ah Hock Chicken Rice', 'Chicken rice', '#01-12', 1),
       (1, 'Lao Ban Laksa',        'Laksa',        '#01-20', 1),
       (1, 'Ahmad Nasi Lemak',     'Malay',        '#02-11', 0);

INSERT INTO MenuItems (StallId, Name, Description, Price, IsSoldOut)
VALUES (1, 'Roasted Chicken Rice', 'Roasted chicken on fragrant rice, with chilli and ginger', 4.50, 0),
       (1, 'Steamed Chicken Rice', 'Poached chicken on fragrant rice, with chilli and ginger', 4.50, 0),
       (1, 'Char Siew Rice',       'Barbecued pork with sweet sauce over rice',              5.00, 0),
       (1, 'Braised Egg',          NULL,                                                       1.00, 1),
       (2, 'Curry Laksa',          'Rice noodles in coconut curry broth with prawns',        5.80, 0),
       (2, 'Iced Milo',            NULL,                                                       1.50, 0),
       (3, 'Nasi Lemak with Chicken Wing', 'Coconut rice, sambal, egg, ikan bilis, peanuts', 5.50, 0);

-- Test accounts are created through POST /api/auth/register so passwords are hashed properly.
