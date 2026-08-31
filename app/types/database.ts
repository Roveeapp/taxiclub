/**
 * Tipos del esquema de Supabase.
 *
 * GENERADO — no editar a mano. Para regenerarlo:
 *
 *   supabase gen types typescript --db-url "$DATABASE_URL" > app/types/database.ts
 *
 * El fichero anterior estaba escrito y mantenido a mano (586 líneas), y por eso
 * se había desincronizado del esquema real: `stripe-webhook` referenciaba una
 * columna `payment_status` que no existe en `bookings`, y el compilador no podía
 * decirlo. Ahora sale del esquema, que además está sincronizado con las
 * migraciones desde la baseline 20260831000000.
 *
 * Incluye también las firmas de las funciones RPC del proyecto, así que a medio
 * plazo permite retirar los casts de utils/db.ts y usar el cliente tipado.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      booking_assignments: {
        Row: {
          assigned_at: string | null
          booking_id: string
          confirmed_at: string | null
          confirmed_phone: string | null
          confirmed_plate: string | null
          driver_id: string
          has_substitute: boolean | null
          id: string
          substitute_phone: string | null
          substitute_plate: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          booking_id: string
          confirmed_at?: string | null
          confirmed_phone?: string | null
          confirmed_plate?: string | null
          driver_id: string
          has_substitute?: boolean | null
          id?: string
          substitute_phone?: string | null
          substitute_plate?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          booking_id?: string
          confirmed_at?: string | null
          confirmed_phone?: string | null
          confirmed_plate?: string | null
          driver_id?: string
          has_substitute?: boolean | null
          id?: string
          substitute_phone?: string | null
          substitute_plate?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_assignments_booking_id_bookings_id_fk"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_assignments_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          base_price: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          created_at: string | null
          deposit_amount: number | null
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          destination_station_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          luggage_big: number
          luggage_hand: number
          needs_accessible: boolean | null
          needs_child_seat: boolean | null
          needs_large_vehicle: boolean | null
          needs_pet_friendly: boolean | null
          offer_id: string | null
          origin_address: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_station_id: string | null
          passengers: number
          pickup_at: string
          status: string
          stripe_payment_intent_id: string | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          base_price: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_station_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          luggage_big?: number
          luggage_hand?: number
          needs_accessible?: boolean | null
          needs_child_seat?: boolean | null
          needs_large_vehicle?: boolean | null
          needs_pet_friendly?: boolean | null
          offer_id?: string | null
          origin_address?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_station_id?: string | null
          passengers?: number
          pickup_at: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_station_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          luggage_big?: number
          luggage_hand?: number
          needs_accessible?: boolean | null
          needs_child_seat?: boolean | null
          needs_large_vehicle?: boolean | null
          needs_pet_friendly?: boolean | null
          offer_id?: string | null
          origin_address?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_station_id?: string | null
          passengers?: number
          pickup_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_users_id_fk"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_users_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_destination_station_id_stations_id_fk"
            columns: ["destination_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "return_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_origin_station_id_stations_id_fk"
            columns: ["origin_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_availability: {
        Row: {
          date: string
          driver_id: string
          hour_from: string | null
          hour_to: string | null
          id: string
          is_available: boolean | null
          time_slots: Json | null
        }
        Insert: {
          date: string
          driver_id: string
          hour_from?: string | null
          hour_to?: string | null
          id?: string
          is_available?: boolean | null
          time_slots?: Json | null
        }
        Update: {
          date?: string
          driver_id?: string
          hour_from?: string | null
          hour_to?: string | null
          id?: string
          is_available?: boolean | null
          time_slots?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_availability_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_fixed_routes: {
        Row: {
          created_at: string | null
          dest_label: string
          dest_lat: number | null
          dest_lng: number | null
          dest_station_id: string | null
          driver_id: string
          id: string
          origin_label: string
          origin_lat: number | null
          origin_lng: number | null
          origin_station_id: string | null
          price: number
        }
        Insert: {
          created_at?: string | null
          dest_label: string
          dest_lat?: number | null
          dest_lng?: number | null
          dest_station_id?: string | null
          driver_id: string
          id?: string
          origin_label: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_station_id?: string | null
          price: number
        }
        Update: {
          created_at?: string | null
          dest_label?: string
          dest_lat?: number | null
          dest_lng?: number | null
          dest_station_id?: string | null
          driver_id?: string
          id?: string
          origin_label?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_station_id?: string | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_fixed_routes_dest_station_id_fkey"
            columns: ["dest_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fixed_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fixed_routes_origin_station_id_fkey"
            columns: ["origin_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payouts: {
        Row: {
          commission_amt: number
          commission_pct: number
          created_at: string | null
          driver_id: string
          final_payout: number
          gross_amount: number
          id: string
          membership_fee: number | null
          net_amount: number
          paid_at: string | null
          period_end: string
          period_start: string
          stripe_payout_id: string | null
        }
        Insert: {
          commission_amt: number
          commission_pct: number
          created_at?: string | null
          driver_id: string
          final_payout: number
          gross_amount: number
          id?: string
          membership_fee?: number | null
          net_amount: number
          paid_at?: string | null
          period_end: string
          period_start: string
          stripe_payout_id?: string | null
        }
        Update: {
          commission_amt?: number
          commission_pct?: number
          created_at?: string | null
          driver_id?: string
          final_payout?: number
          gross_amount?: number
          id?: string
          membership_fee?: number | null
          net_amount?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payouts_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_station_zones: {
        Row: {
          created_at: string | null
          driver_id: string
          fixed_price: number | null
          id: string
          mode: string
          radius_from_km: number
          radius_to_km: number
          station_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          fixed_price?: number | null
          id?: string
          mode: string
          radius_from_km?: number
          radius_to_km: number
          station_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          fixed_price?: number | null
          id?: string
          mode?: string
          radius_from_km?: number
          radius_to_km?: number
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_station_zones_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_station_zones_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_stations: {
        Row: {
          driver_id: string
          is_active: boolean | null
          joined_at: string | null
          station_id: string
        }
        Insert: {
          driver_id: string
          is_active?: boolean | null
          joined_at?: string | null
          station_id: string
        }
        Update: {
          driver_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_stations_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_stations_station_id_stations_id_fk"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          custom_commission_pct: number | null
          custom_monthly_fee: number | null
          custom_price_per_km: number | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          is_exempt: boolean | null
          is_member: boolean | null
          last_assigned_at: string | null
          license_city: string
          license_number: string
          member_since: string | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_commission_pct?: number | null
          custom_monthly_fee?: number | null
          custom_price_per_km?: number | null
          id: string
          is_active?: boolean | null
          is_approved?: boolean | null
          is_exempt?: boolean | null
          is_member?: boolean | null
          last_assigned_at?: string | null
          license_city: string
          license_number: string
          member_since?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_commission_pct?: number | null
          custom_monthly_fee?: number | null
          custom_price_per_km?: number | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          is_exempt?: boolean | null
          is_member?: boolean | null
          last_assigned_at?: string | null
          license_city?: string
          license_number?: string
          member_since?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_id_users_id_fk"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          amount: number
          created_at: string | null
          driver_id: string
          id: string
          is_exempt: boolean | null
          paid_at: string | null
          period_end: string
          period_start: string
          stripe_invoice_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          driver_id: string
          id?: string
          is_exempt?: boolean | null
          paid_at?: string | null
          period_end: string
          period_start: string
          stripe_invoice_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          driver_id?: string
          id?: string
          is_exempt?: boolean | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      return_offers: {
        Row: {
          available_from: string
          available_until: string
          base_price: number
          booked_by_id: string | null
          created_at: string | null
          destination_station_id: string
          discount_pct: number
          driver_id: string
          final_price: number
          id: string
          max_passengers: number
          origin_address: string
          origin_booking_id: string | null
          origin_lat: number | null
          origin_lng: number | null
          status: string
        }
        Insert: {
          available_from: string
          available_until: string
          base_price: number
          booked_by_id?: string | null
          created_at?: string | null
          destination_station_id: string
          discount_pct?: number
          driver_id: string
          final_price: number
          id?: string
          max_passengers?: number
          origin_address: string
          origin_booking_id?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          status?: string
        }
        Update: {
          available_from?: string
          available_until?: string
          base_price?: number
          booked_by_id?: string | null
          created_at?: string | null
          destination_station_id?: string
          discount_pct?: number
          driver_id?: string
          final_price?: number
          id?: string
          max_passengers?: number
          origin_address?: string
          origin_booking_id?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_offers_booked_by_id_bookings_id_fk"
            columns: ["booked_by_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_offers_destination_station_id_stations_id_fk"
            columns: ["destination_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_offers_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_offers_origin_booking_id_bookings_id_fk"
            columns: ["origin_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      route_prices: {
        Row: {
          base_price: number
          destination_city: string | null
          destination_station_id: string | null
          id: string
          is_return: boolean | null
          origin_station_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          destination_city?: string | null
          destination_station_id?: string | null
          id?: string
          is_return?: boolean | null
          origin_station_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          destination_city?: string | null
          destination_station_id?: string | null
          id?: string
          is_return?: boolean | null
          origin_station_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_prices_destination_station_id_stations_id_fk"
            columns: ["destination_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_prices_origin_station_id_stations_id_fk"
            columns: ["origin_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address: string
          created_at: string | null
          id: string
          is_favorite: boolean | null
          label: string
          lat: number | null
          lng: number | null
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          label: string
          lat?: number | null
          lng?: number | null
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          label?: string
          lat?: number | null
          lng?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      station_exclusivities: {
        Row: {
          created_at: string | null
          driver_id: string
          station_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          station_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_exclusivities_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_exclusivities_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: true
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          address: string | null
          city: string
          created_at: string | null
          id: string
          is_active: boolean | null
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          push_subscription: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          push_subscription?: Json | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          push_subscription?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_accessories: {
        Row: {
          accessory_id: string
          created_at: string | null
          vehicle_id: string
        }
        Insert: {
          accessory_id: string
          created_at?: string | null
          vehicle_id: string
        }
        Update: {
          accessory_id?: string
          created_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_accessories_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_accessories_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          driver_id: string
          has_child_seat: boolean | null
          has_pet_friendly: boolean | null
          id: string
          is_accessible: boolean | null
          is_active: boolean | null
          is_large_vehicle: boolean | null
          max_luggage_big: number
          max_luggage_hand: number
          max_passengers: number
          model: string
          photo_url: string | null
          plate: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string | null
          driver_id: string
          has_child_seat?: boolean | null
          has_pet_friendly?: boolean | null
          id?: string
          is_accessible?: boolean | null
          is_active?: boolean | null
          is_large_vehicle?: boolean | null
          max_luggage_big?: number
          max_luggage_hand?: number
          max_passengers?: number
          model: string
          photo_url?: string | null
          plate: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          driver_id?: string
          has_child_seat?: boolean | null
          has_pet_friendly?: boolean | null
          id?: string
          is_accessible?: boolean | null
          is_active?: boolean | null
          is_large_vehicle?: boolean | null
          max_luggage_big?: number
          max_luggage_hand?: number
          max_passengers?: number
          model?: string
          photo_url?: string | null
          plate?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_drivers_id_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_offers: {
        Args: never
        Returns: {
          id: string
        }[]
      }
      get_active_drivers: {
        Args: never
        Returns: {
          id: string
        }[]
      }
      get_active_members: {
        Args: never
        Returns: {
          email: string
          id: string
          stripe_account_id: string
        }[]
      }
      get_active_offers: {
        Args: never
        Returns: {
          available_from: string
          available_until: string
          base_price: number
          booked_by_id: string
          created_at: string
          destination_station_id: string
          destination_station_name: string
          discount_pct: number
          driver_id: string
          driver_name: string
          final_price: number
          id: string
          max_passengers: number
          origin_address: string
          origin_booking_id: string
          origin_lat: number
          origin_lng: number
          status: string
        }[]
      }
      get_admin_bookings: {
        Args: { p_date: string; p_status: string }
        Returns: {
          base_price: number
          cancellation_reason: string
          cancelled_at: string
          cancelled_by: string
          client_email: string
          client_id: string
          client_name: string
          confirmed_phone: string
          confirmed_plate: string
          created_at: string
          deposit_amount: number
          destination_address: string
          destination_lat: number
          destination_lng: number
          destination_station_id: string
          driver_id: string
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          luggage_big: number
          luggage_hand: number
          needs_accessible: boolean
          needs_child_seat: boolean
          needs_large_vehicle: boolean
          needs_pet_friendly: boolean
          origin_address: string
          origin_station_id: string
          origin_station_name: string
          passengers: number
          pickup_at: string
          status: string
          stripe_payment_intent_id: string
          total_price: number
          updated_at: string
        }[]
      }
      get_admin_drivers: {
        Args: never
        Returns: {
          created_at: string
          custom_commission_pct: number
          custom_monthly_fee: number
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          is_exempt: boolean
          is_member: boolean
          last_assigned_at: string
          license_city: string
          license_number: string
          member_since: string
          phone: string
          stripe_account_id: string
          updated_at: string
          vehicle_count: number
        }[]
      }
      get_admin_payouts: {
        Args: never
        Returns: {
          commission_amt: number
          commission_pct: number
          created_at: string
          driver_email: string
          driver_id: string
          driver_name: string
          final_payout: number
          gross_amount: number
          id: string
          membership_fee: number
          net_amount: number
          paid_at: string
          period_end: string
          period_start: string
          stripe_payout_id: string
        }[]
      }
      get_admin_stations: {
        Args: never
        Returns: {
          address: string
          city: string
          created_at: string
          driver_count: number
          id: string
          is_active: boolean
          lat: number
          lng: number
          name: string
        }[]
      }
      get_booking_by_id: {
        Args: { p_id: string; p_user_id?: string }
        Returns: {
          base_price: number
          cancellation_reason: string
          cancelled_at: string
          cancelled_by: string
          client_id: string
          confirmed_at: string
          confirmed_phone: string
          confirmed_plate: string
          created_at: string
          deposit_amount: number
          destination_address: string
          destination_lat: number
          destination_lng: number
          destination_station_id: string
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          luggage_big: number
          luggage_hand: number
          needs_accessible: boolean
          needs_child_seat: boolean
          needs_large_vehicle: boolean
          needs_pet_friendly: boolean
          offer_id: string
          origin_address: string
          origin_station_id: string
          origin_station_name: string
          passengers: number
          pickup_at: string
          status: string
          stripe_payment_intent_id: string
          total_price: number
          updated_at: string
        }[]
      }
      get_driver_for_assignment: {
        Args: {
          p_dest_lat?: number
          p_dest_lng?: number
          p_destination_station_id: string
          p_luggage_big: number
          p_luggage_hand: number
          p_needs_accessible: boolean
          p_needs_child_seat: boolean
          p_needs_large_vehicle: boolean
          p_needs_pet_friendly: boolean
          p_origin_lat?: number
          p_origin_lng?: number
          p_origin_station_id: string
          p_passengers: number
          p_pickup_at: string
        }
        Returns: {
          id: string
          last_assigned_at: string
          plate: string
          vehicle_id: string
        }[]
      }
      get_driver_offers: {
        Args: { p_driver_id: string }
        Returns: {
          available_from: string
          available_until: string
          base_price: number
          booked_by_id: string
          created_at: string
          destination_station_id: string
          destination_station_name: string
          discount_pct: number
          driver_id: string
          final_price: number
          id: string
          max_passengers: number
          origin_address: string
          origin_booking_id: string
          origin_lat: number
          origin_lng: number
          status: string
        }[]
      }
      get_driver_payout_data: {
        Args: { p_driver_id: string }
        Returns: {
          created_at: string
          custom_commission_pct: number
          custom_monthly_fee: number
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          is_exempt: boolean
          is_member: boolean
          last_assigned_at: string
          license_city: string
          license_number: string
          member_since: string
          stripe_account_id: string
          updated_at: string
        }[]
      }
      get_driver_profile: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          driver_created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_exempt: boolean
          is_member: boolean
          last_assigned_at: string
          license_city: string
          license_number: string
          member_since: string
          phone: string
          role: string
          stripe_account_id: string
        }[]
      }
      get_driver_push_sub: {
        Args: { p_driver_id: string }
        Returns: {
          push_subscription: Json
        }[]
      }
      get_driver_reservations: {
        Args: { p_driver_id: string }
        Returns: {
          base_price: number
          cancellation_reason: string
          cancelled_at: string
          cancelled_by: string
          client_id: string
          confirmed_at: string
          confirmed_phone: string
          confirmed_plate: string
          created_at: string
          deposit_amount: number
          destination_address: string
          destination_lat: number
          destination_lng: number
          destination_station_id: string
          guest_email: string
          guest_name: string
          guest_phone: string
          has_substitute: boolean
          id: string
          luggage_big: number
          luggage_hand: number
          needs_accessible: boolean
          needs_child_seat: boolean
          needs_large_vehicle: boolean
          needs_pet_friendly: boolean
          origin_address: string
          origin_station_id: string
          origin_station_name: string
          passengers: number
          pickup_at: string
          status: string
          stripe_payment_intent_id: string
          substitute_phone: string
          substitute_plate: string
          total_price: number
          updated_at: string
        }[]
      }
      get_driver_stations: {
        Args: { p_driver_id: string }
        Returns: {
          address: string
          city: string
          created_at: string
          id: string
          is_active: boolean
          is_active_ds: boolean
          joined_at: string
          lat: number
          lng: number
          name: string
        }[]
      }
      get_metrics: {
        Args: { p_today: string }
        Returns: {
          active_drivers: number
          active_offers: number
          bookings_today: number
        }[]
      }
      get_offer_by_id: {
        Args: { p_id: string }
        Returns: {
          available_from: string
          available_until: string
          base_price: number
          booked_by_id: string
          created_at: string
          destination_station_id: string
          destination_station_name: string
          discount_pct: number
          driver_id: string
          driver_name: string
          driver_plate: string
          final_price: number
          id: string
          max_passengers: number
          origin_address: string
          origin_booking_id: string
          origin_lat: number
          origin_lng: number
          status: string
        }[]
      }
      get_reservation_by_id: {
        Args: { p_booking_id: string; p_driver_id: string }
        Returns: {
          assigned_at: string
          base_price: number
          booking_id: string
          cancellation_reason: string
          cancelled_at: string
          cancelled_by: string
          client_id: string
          client_name: string
          client_phone: string
          confirmed_at: string
          confirmed_phone: string
          confirmed_plate: string
          created_at: string
          destination_address: string
          destination_lat: number
          destination_lng: number
          destination_station_id: string
          driver_id: string
          has_substitute: boolean
          id: string
          luggage_big: number
          luggage_hand: number
          needs_accessible: boolean
          needs_child_seat: boolean
          needs_large_vehicle: boolean
          needs_pet_friendly: boolean
          origin_station_id: string
          origin_station_name: string
          passengers: number
          pickup_at: string
          status: string
          stripe_payment_intent_id: string
          substitute_phone: string
          substitute_plate: string
          total_price: number
          updated_at: string
        }[]
      }
      get_route_price: {
        Args: { p_destination_id: string; p_origin_id: string }
        Returns: {
          base_price: number
        }[]
      }
      get_trips_for_payout: {
        Args: {
          p_driver_id: string
          p_month_end: string
          p_month_start: string
        }
        Returns: {
          total_price: number
        }[]
      }
      get_unconfirmed_assignments: {
        Args: { p_threshold: string }
        Returns: {
          booking_id: string
          driver_id: string
          id: string
        }[]
      }
      get_unconfirmed_assignments_v2: {
        Args: { p_threshold: string }
        Returns: {
          booking_id: string
          destination_address: string
          driver_email: string
          driver_id: string
          driver_name: string
          id: string
          origin_station_name: string
          pickup_at: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_vehicle_with_accessories: {
        Args: { p_driver_id: string; p_id: string }
        Returns: {
          accessories: Json
          brand: string
          color: string
          created_at: string
          driver_id: string
          has_child_seat: boolean
          has_pet_friendly: boolean
          id: string
          is_accessible: boolean
          is_active: boolean
          is_large_vehicle: boolean
          max_luggage_big: number
          max_luggage_hand: number
          max_passengers: number
          model: string
          photo_url: string
          plate: string
          year: number
        }[]
      }
      get_vehicles_with_accessories: {
        Args: { p_driver_id: string }
        Returns: {
          accessories: Json
          brand: string
          color: string
          created_at: string
          driver_id: string
          has_child_seat: boolean
          has_pet_friendly: boolean
          id: string
          is_accessible: boolean
          is_active: boolean
          is_large_vehicle: boolean
          max_luggage_big: number
          max_luggage_hand: number
          max_passengers: number
          model: string
          photo_url: string
          plate: string
          year: number
        }[]
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      notify_client_cancelled_data: {
        Args: { p_booking_id: string }
        Returns: {
          email: string
        }[]
      }
      notify_client_confirmed_data: {
        Args: { p_booking_id: string }
        Returns: {
          confirmed_phone: string
          confirmed_plate: string
          email: string
          id: string
        }[]
      }
      notify_driver_data: {
        Args: { p_driver_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_exempt: boolean
          is_member: boolean
          last_assigned_at: string
          license_city: string
          license_number: string
          phone: string
          stripe_account_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

