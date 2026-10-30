import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS12Part2LogisticsAndDocuments1711000000005 implements MigrationInterface {
  name = 'KMSICAMS12Part2LogisticsAndDocuments1711000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Freight Forwarder master table (IMP-23)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "freight_forwarder" (
        "freight_forwarder_id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "country" VARCHAR(100) NOT NULL,
        "contact_person" VARCHAR(100),
        "phone" VARCHAR(50),
        "email" VARCHAR(100),
        "address" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Add selected_forwarder_id to shipment table
    await queryRunner.query(`
      ALTER TABLE "shipment"
      ADD COLUMN IF NOT EXISTS "selected_forwarder_id" BIGINT REFERENCES "freight_forwarder"("freight_forwarder_id") ON DELETE SET NULL;
    `);

    // 2. Shipment Freight Quotation table (IMP-24, IMP-25)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_freight_quotation" (
        "quotation_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "freight_forwarder_id" BIGINT NOT NULL REFERENCES "freight_forwarder"("freight_forwarder_id") ON DELETE RESTRICT,
        "quotation_reference" VARCHAR(100),
        "quotation_date" DATE,
        "valid_until" DATE,
        "freight_amount" NUMERIC(16, 2) NOT NULL DEFAULT 0,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
        "estimated_transit_days" INT,
        "destination_charges" NUMERIC(16, 2) NOT NULL DEFAULT 0,
        "additional_terms" TEXT,
        "attachment_id" BIGINT REFERENCES "attachment"("attachment_id") ON DELETE SET NULL,
        "selection_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        "selection_reason" TEXT,
        "selected_by" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "selected_at" TIMESTAMPTZ,
        "created_by" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. Shipment Booking and Vessel details (IMP-26)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_booking" (
        "booking_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "freight_forwarder_id" BIGINT REFERENCES "freight_forwarder"("freight_forwarder_id") ON DELETE SET NULL,
        "booking_reference" VARCHAR(100) NOT NULL,
        "carrier_name" VARCHAR(100),
        "vessel_name" VARCHAR(100),
        "voyage_number" VARCHAR(50),
        "origin_port" VARCHAR(100),
        "destination_port" VARCHAR(100),
        "estimated_departure_date" DATE,
        "actual_departure_date" DATE,
        "estimated_arrival_date" DATE,
        "actual_arrival_date" DATE,
        "booking_status" VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
        "notes" TEXT,
        "created_by" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 4. Container Management (IMP-27)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_container" (
        "container_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "container_number" VARCHAR(50) NOT NULL,
        "container_type" VARCHAR(50) NOT NULL DEFAULT '40ft HC',
        "payload_capacity_kg" NUMERIC(12, 2),
        "gross_weight_kg" NUMERIC(12, 2),
        "seal_number" VARCHAR(50),
        "loading_date" DATE,
        "free_time_days" INT NOT NULL DEFAULT 14,
        "free_time_end_date" DATE,
        "empty_return_due_date" DATE,
        "container_status" VARCHAR(30) NOT NULL DEFAULT 'LOADED',
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 5. Cargo Readiness and Shipping Milestones (IMP-28)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_milestone" (
        "milestone_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "milestone_name" VARCHAR(100) NOT NULL,
        "planned_date" DATE,
        "milestone_date" DATE,
        "is_completed" BOOLEAN NOT NULL DEFAULT false,
        "completed_at" TIMESTAMPTZ,
        "completed_by" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 6. Shipment Insurance (IMP-29)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_insurance" (
        "insurance_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "policy_number" VARCHAR(100) NOT NULL,
        "insurer_name" VARCHAR(150) NOT NULL,
        "insured_value" NUMERIC(16, 2) NOT NULL,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
        "premium_amount" NUMERIC(16, 2),
        "coverage_type" VARCHAR(150) NOT NULL DEFAULT 'All Risks (Institute Cargo Clauses A)',
        "issue_date" DATE,
        "valid_until" DATE,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 7. ECTN and Shipping Deadline Tracking (IMP-30)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_cargo_tracking" (
        "tracking_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "document_name" VARCHAR(100) NOT NULL DEFAULT 'ECTN / BESC Certificate',
        "reference_number" VARCHAR(100),
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "submission_date" DATE,
        "deadline_date" DATE,
        "shipping_cut_off_date" DATE,
        "verified_at" TIMESTAMPTZ,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 8. Shipping Document Control and Verification (IMP-32 through IMP-37)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipment_document" (
        "shipment_document_id" BIGSERIAL PRIMARY KEY,
        "shipment_id" BIGINT NOT NULL REFERENCES "shipment"("shipment_id") ON DELETE CASCADE,
        "po_id" BIGINT REFERENCES "purchase_order"("po_id") ON DELETE SET NULL,
        "attachment_id" BIGINT REFERENCES "attachment"("attachment_id") ON DELETE SET NULL,
        "document_type" VARCHAR(60) NOT NULL,
        "document_reference" VARCHAR(100),
        "issue_date" DATE,
        "expiry_date" DATE,
        "received_date" DATE,
        "verification_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "verified_by" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "verified_at" TIMESTAMPTZ,
        "verification_notes" TEXT,
        "original_document_status" VARCHAR(30) NOT NULL DEFAULT 'NOT_RECEIVED',
        "release_date" DATE,
        "created_by" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 9. Import Notifications & Overdue Alerts (IMP-40, IMP-41)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "import_notification" (
        "notification_id" BIGSERIAL PRIMARY KEY,
        "event_type" VARCHAR(60) NOT NULL,
        "recipient_role" VARCHAR(60),
        "recipient_user_id" INT REFERENCES "app_user"("user_id") ON DELETE SET NULL,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" VARCHAR(50) NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "message" TEXT NOT NULL,
        "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Seed Initial Freight Forwarders
    await queryRunner.query(`
      INSERT INTO "freight_forwarder" ("name", "country", "contact_person", "phone", "email", "address", "is_active")
      VALUES
        ('Bolloré Logistics Ethiopia / Horn of Africa', 'Ethiopia', 'Tewodros Assefa', '+251 11 551 8820', 'horn.africa@bollore.com', 'Bole Subcity, Djibouti St, Addis Ababa', true),
        ('Kuehne + Nagel Djibouti FZCO', 'Djibouti', 'Jean-Marc Dupont', '+253 21 35 48 90', 'djibouti.sales@kuehne-nagel.com', 'Port of Djibouti Free Trade Zone, Djibouti', true),
        ('Maersk Logistics & Ocean Line (Addis Ababa)', 'Ethiopia', 'Alemayehu Tadesse', '+251 11 662 4400', 'ethiopia.customs@maersk.com', 'Cameroon Street, Bole, Addis Ababa', true),
        ('Ethiopian Shipping & Logistics Services Enterprise (ESLSE)', 'Ethiopia', 'Mulugeta Kebede', '+251 11 551 4055', 'eslse@eslse.et', 'Legahar, Churchill Ave, Addis Ababa', true)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "import_notification" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_document" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_cargo_tracking" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_insurance" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_milestone" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_container" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_booking" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipment_freight_quotation" CASCADE;`);
    await queryRunner.query(`ALTER TABLE "shipment" DROP COLUMN IF EXISTS "selected_forwarder_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "freight_forwarder" CASCADE;`);
  }
}

