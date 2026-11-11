IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [Departments] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_Departments] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [FullName] nvarchar(150) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [PasswordHash] nvarchar(500) NOT NULL,
        [PhoneNumber] nvarchar(20) NULL,
        [Role] nvarchar(20) NOT NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [Doctors] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [DepartmentId] int NOT NULL,
        [Specialization] nvarchar(150) NOT NULL,
        [LicenseNumber] nvarchar(60) NOT NULL,
        [ConsultationFee] decimal(10,2) NOT NULL,
        [SlotDurationMinutes] int NOT NULL DEFAULT 30,
        [MaxDailyAppointments] int NOT NULL DEFAULT 16,
        [YearsOfExperience] int NOT NULL,
        [Bio] nvarchar(1000) NULL,
        [IsAvailableForBooking] bit NOT NULL DEFAULT CAST(1 AS bit),
        CONSTRAINT [PK_Doctors] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Doctors_ConsultationFee] CHECK ([ConsultationFee] >= 0),
        CONSTRAINT [CK_Doctors_MaxDailyAppointments] CHECK ([MaxDailyAppointments] > 0),
        CONSTRAINT [CK_Doctors_SlotDurationMinutes] CHECK ([SlotDurationMinutes] BETWEEN 10 AND 120),
        CONSTRAINT [CK_Doctors_YearsOfExperience] CHECK ([YearsOfExperience] >= 0),
        CONSTRAINT [FK_Doctors_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Doctors_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [Patients] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [DateOfBirth] date NULL,
        [Gender] nvarchar(20) NULL,
        [BloodGroup] nvarchar(10) NULL,
        [Address] nvarchar(300) NULL,
        [EmergencyContact] nvarchar(100) NULL,
        CONSTRAINT [PK_Patients] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Patients_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [DoctorLeaves] (
        [Id] int NOT NULL IDENTITY,
        [DoctorId] int NOT NULL,
        [StartDate] date NOT NULL,
        [EndDate] date NOT NULL,
        [Reason] nvarchar(300) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_DoctorLeaves] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_DoctorLeaves_DateRange] CHECK ([EndDate] >= [StartDate]),
        CONSTRAINT [FK_DoctorLeaves_Doctors_DoctorId] FOREIGN KEY ([DoctorId]) REFERENCES [Doctors] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [DoctorSchedules] (
        [Id] int NOT NULL IDENTITY,
        [DoctorId] int NOT NULL,
        [DayOfWeek] int NOT NULL,
        [StartTime] time NOT NULL,
        [EndTime] time NOT NULL,
        [BreakStartTime] time NULL,
        [BreakEndTime] time NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        CONSTRAINT [PK_DoctorSchedules] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_DoctorSchedules_BreakRange] CHECK (([BreakStartTime] IS NULL AND [BreakEndTime] IS NULL) OR ([BreakStartTime] IS NOT NULL AND [BreakEndTime] IS NOT NULL AND [BreakEndTime] > [BreakStartTime] AND [BreakStartTime] >= [StartTime] AND [BreakEndTime] <= [EndTime])),
        CONSTRAINT [CK_DoctorSchedules_TimeRange] CHECK ([EndTime] > [StartTime]),
        CONSTRAINT [FK_DoctorSchedules_Doctors_DoctorId] FOREIGN KEY ([DoctorId]) REFERENCES [Doctors] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE TABLE [Appointments] (
        [Id] int NOT NULL IDENTITY,
        [DoctorId] int NOT NULL,
        [PatientId] int NOT NULL,
        [AppointmentDate] date NOT NULL,
        [StartTime] time NOT NULL,
        [EndTime] time NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [ReasonForVisit] nvarchar(500) NOT NULL,
        [Notes] nvarchar(1000) NULL,
        [CancellationReason] nvarchar(500) NULL,
        [AllocatedBySmartEngine] bit NOT NULL,
        [RecommendationScore] decimal(5,2) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Appointments] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Appointments_TimeRange] CHECK ([EndTime] > [StartTime]),
        CONSTRAINT [FK_Appointments_Doctors_DoctorId] FOREIGN KEY ([DoctorId]) REFERENCES [Doctors] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Appointments_Patients_PatientId] FOREIGN KEY ([PatientId]) REFERENCES [Patients] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Appointments_Doctor_Date_Status] ON [Appointments] ([DoctorId], [AppointmentDate], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Appointments_Patient_Date_Status] ON [Appointments] ([PatientId], [AppointmentDate], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_Appointments_Doctor_Slot] ON [Appointments] ([DoctorId], [AppointmentDate], [StartTime]) WHERE [Status] <> ''Cancelled''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_Appointments_Patient_Slot] ON [Appointments] ([PatientId], [AppointmentDate], [StartTime]) WHERE [Status] <> ''Cancelled''');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Departments_Name] ON [Departments] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DoctorLeaves_Doctor_Dates_Status] ON [DoctorLeaves] ([DoctorId], [StartDate], [EndDate], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Doctors_DepartmentId] ON [Doctors] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Doctors_LicenseNumber] ON [Doctors] ([LicenseNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Doctors_Specialization] ON [Doctors] ([Specialization]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Doctors_UserId] ON [Doctors] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DoctorSchedules_DoctorId_DayOfWeek] ON [DoctorSchedules] ([DoctorId], [DayOfWeek]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Patients_UserId] ON [Patients] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261111150721_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261111150721_InitialCreate', N'10.0.15');
END;

COMMIT;
GO

