export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          full_name: string | null
          role: string
          push_subscription: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          phone?: string | null
          full_name?: string | null
          role: string
          push_subscription?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          full_name?: string | null
          role?: string
          push_subscription?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      drivers: {
        Row: {
          id: string
          license_number: string
          license_city: string
          is_member: boolean
          member_since: string | null
          is_exempt: boolean
          is_active: boolean
          last_assigned_at: string | null
          stripe_account_id: string | null
          custom_monthly_fee: number | null
          custom_commission_pct: number | null
          created_at: string | null
        }
        Insert: {
          id: string
          license_number: string
          license_city: string
          is_member?: boolean
          member_since?: string | null
          is_exempt?: boolean
          is_active?: boolean
          last_assigned_at?: string | null
          stripe_account_id?: string | null
          custom_monthly_fee?: number | null
          custom_commission_pct?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          license_number?: string
          license_city?: string
          is_member?: boolean
          member_since?: string | null
          is_exempt?: boolean
          is_active?: boolean
          last_assigned_at?: string | null
          stripe_account_id?: string | null
          custom_monthly_fee?: number | null
          custom_commission_pct?: number | null
          created_at?: string | null
        }
      }
      vehicles: {
        Row: {
          id: string
          driver_id: string
          plate: string
          brand: string
          model: string
          year: number | null
          color: string | null
          max_passengers: number
          max_luggage_big: number
          max_luggage_hand: number
          has_child_seat: boolean
          has_pet_friendly: boolean
          is_accessible: boolean
          is_large_vehicle: boolean
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          plate: string
          brand: string
          model: string
          year?: number | null
          color?: string | null
          max_passengers?: number
          max_luggage_big?: number
          max_luggage_hand?: number
          has_child_seat?: boolean
          has_pet_friendly?: boolean
          is_accessible?: boolean
          is_large_vehicle?: boolean
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          plate?: string
          brand?: string
          model?: string
          year?: number | null
          color?: string | null
          max_passengers?: number
          max_luggage_big?: number
          max_luggage_hand?: number
          has_child_seat?: boolean
          has_pet_friendly?: boolean
          is_accessible?: boolean
          is_large_vehicle?: boolean
          is_active?: boolean
          created_at?: string | null
        }
      }
      stations: {
        Row: {
          id: string
          name: string
          city: string
          address: string | null
          lat: number | null
          lng: number | null
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          city: string
          address?: string | null
          lat?: number | null
          lng?: number | null
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          city?: string
          address?: string | null
          lat?: number | null
          lng?: number | null
          is_active?: boolean
          created_at?: string | null
        }
      }
      driver_stations: {
        Row: {
          driver_id: string
          station_id: string
          is_active: boolean
          joined_at: string | null
        }
        Insert: {
          driver_id: string
          station_id: string
          is_active?: boolean
          joined_at?: string | null
        }
        Update: {
          driver_id?: string
          station_id?: string
          is_active?: boolean
          joined_at?: string | null
        }
      }
      driver_availability: {
        Row: {
          id: string
          driver_id: string
          date: string
          is_available: boolean
          hour_from: string | null
          hour_to: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          date: string
          is_available?: boolean
          hour_from?: string | null
          hour_to?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          date?: string
          is_available?: boolean
          hour_from?: string | null
          hour_to?: string | null
        }
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          origin_station_id: string
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          destination_station_id: string | null
          pickup_at: string
          passengers: number
          luggage_big: number
          luggage_hand: number
          needs_child_seat: boolean
          needs_pet_friendly: boolean
          needs_accessible: boolean
          needs_large_vehicle: boolean
          base_price: number
          total_price: number
          status: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          stripe_payment_intent_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          origin_station_id: string
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_station_id?: string | null
          pickup_at: string
          passengers?: number
          luggage_big?: number
          luggage_hand?: number
          needs_child_seat?: boolean
          needs_pet_friendly?: boolean
          needs_accessible?: boolean
          needs_large_vehicle?: boolean
          base_price: number
          total_price: number
          status?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          origin_station_id?: string
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_station_id?: string | null
          pickup_at?: string
          passengers?: number
          luggage_big?: number
          luggage_hand?: number
          needs_child_seat?: boolean
          needs_pet_friendly?: boolean
          needs_accessible?: boolean
          needs_large_vehicle?: boolean
          base_price?: number
          total_price?: number
          status?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      booking_assignments: {
        Row: {
          id: string
          booking_id: string
          driver_id: string
          assigned_at: string | null
          confirmed_at: string | null
          confirmed_plate: string | null
          confirmed_phone: string | null
          substitute_plate: string | null
          substitute_phone: string | null
          has_substitute: boolean
        }
        Insert: {
          id?: string
          booking_id: string
          driver_id: string
          assigned_at?: string | null
          confirmed_at?: string | null
          confirmed_plate?: string | null
          confirmed_phone?: string | null
          substitute_plate?: string | null
          substitute_phone?: string | null
          has_substitute?: boolean
        }
        Update: {
          id?: string
          booking_id?: string
          driver_id?: string
          assigned_at?: string | null
          confirmed_at?: string | null
          confirmed_plate?: string | null
          confirmed_phone?: string | null
          substitute_plate?: string | null
          substitute_phone?: string | null
          has_substitute?: boolean
        }
      }
      return_offers: {
        Row: {
          id: string
          driver_id: string
          origin_booking_id: string | null
          origin_address: string
          origin_lat: number | null
          origin_lng: number | null
          destination_station_id: string
          available_from: string
          available_until: string
          max_passengers: number
          discount_pct: number
          base_price: number
          final_price: number
          status: string
          booked_by_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          origin_booking_id?: string | null
          origin_address: string
          origin_lat?: number | null
          origin_lng?: number | null
          destination_station_id: string
          available_from: string
          available_until: string
          max_passengers?: number
          discount_pct?: number
          base_price: number
          final_price: number
          status?: string
          booked_by_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          origin_booking_id?: string | null
          origin_address?: string
          origin_lat?: number | null
          origin_lng?: number | null
          destination_station_id?: string
          available_from?: string
          available_until?: string
          max_passengers?: number
          discount_pct?: number
          base_price?: number
          final_price?: number
          status?: string
          booked_by_id?: string | null
          created_at?: string | null
        }
      }
      memberships: {
        Row: {
          id: string
          driver_id: string
          period_start: string
          period_end: string
          amount: number
          is_exempt: boolean
          stripe_invoice_id: string | null
          paid_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          period_start: string
          period_end: string
          amount: number
          is_exempt?: boolean
          stripe_invoice_id?: string | null
          paid_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          period_start?: string
          period_end?: string
          amount?: number
          is_exempt?: boolean
          stripe_invoice_id?: string | null
          paid_at?: string | null
          created_at?: string | null
        }
      }
      driver_payouts: {
        Row: {
          id: string
          driver_id: string
          period_start: string
          period_end: string
          gross_amount: number
          commission_pct: number
          commission_amt: number
          net_amount: number
          membership_fee: number
          final_payout: number
          stripe_payout_id: string | null
          paid_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          period_start: string
          period_end: string
          gross_amount: number
          commission_pct: number
          commission_amt: number
          net_amount: number
          membership_fee?: number
          final_payout: number
          stripe_payout_id?: string | null
          paid_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          period_start?: string
          period_end?: string
          gross_amount?: number
          commission_pct?: number
          commission_amt?: number
          net_amount?: number
          membership_fee?: number
          final_payout?: number
          stripe_payout_id?: string | null
          paid_at?: string | null
          created_at?: string | null
        }
      }
      system_config: {
        Row: {
          key: string
          value: Json
          updated_at: string | null
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string | null
        }
      }
      route_prices: {
        Row: {
          id: string
          origin_station_id: string | null
          destination_station_id: string | null
          base_price: number
          is_return: boolean
          updated_at: string | null
        }
        Insert: {
          id?: string
          origin_station_id?: string | null
          destination_station_id?: string | null
          base_price: number
          is_return?: boolean
          updated_at?: string | null
        }
        Update: {
          id?: string
          origin_station_id?: string | null
          destination_station_id?: string | null
          base_price?: number
          is_return?: boolean
          updated_at?: string | null
        }
      }
      saved_addresses: {
        Row: {
          id: string
          client_id: string
          label: string
          address: string
          lat: number | null
          lng: number | null
          is_favorite: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          label: string
          address: string
          lat?: number | null
          lng?: number | null
          is_favorite?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          label?: string
          address?: string
          lat?: number | null
          lng?: number | null
          is_favorite?: boolean
          created_at?: string | null
        }
      }
      accessories: {
        Row: {
          id: string
          name: string
          icon: string | null
          description: string | null
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          description?: string | null
        }
      }
      vehicle_accessories: {
        Row: {
          vehicle_id: string
          accessory_id: string
        }
        Insert: {
          vehicle_id: string
          accessory_id: string
        }
        Update: {
          vehicle_id?: string
          accessory_id?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, unknown>
    Enums: Record<string, never>
  }
}
