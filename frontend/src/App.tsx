import { useState } from "react";

import { searchHotels } from "./services/api";
import type { Hotel } from "./services/api";


import "./App.css";

function App() {
  const [city, setCity] =
    useState("");

  const [checkIn, setCheckIn] =
    useState("");

  const [checkOut, setCheckOut] =
    useState("");

  const [hotel, setHotel] =
    useState<Hotel | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const handleSubmit =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setLoading(true);
      setError("");
      setHotel(null);
      setMessage("");

      try {
        const result =
          await searchHotels(
            city,
            checkIn,
            checkOut
          );

        setHotel(result.hotel);
        setMessage(result.message);
      } catch (error) {
        setError(
          "Failed to search hotels. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="container">
      <div className="card">
        <h1>
          Hotel Rate Comparator
        </h1>

        <p className="subtitle">
          Find the best hotel price
          from multiple suppliers
        </p>

        <form
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label>
              City
            </label>

            <input
              type="text"
              placeholder="Enter city"
              value={city}
              onChange={(e) =>
                setCity(
                  e.target.value
                )
              }
              required
            />
          </div>

          <div className="form-group">
            <label>
              Check-in Date
            </label>

            <input
              type="date"
              value={checkIn}
              onChange={(e) =>
                setCheckIn(
                  e.target.value
                )
              }
              required
            />
          </div>

          <div className="form-group">
            <label>
              Check-out Date
            </label>

            <input
              type="date"
              value={checkOut}
              onChange={(e) =>
                setCheckOut(
                  e.target.value
                )
              }
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Searching..."
              : "Search Hotels"}
          </button>
        </form>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {message && !hotel && (
          <div className="message">
            {message}
          </div>
        )}

        {hotel && (
          <div className="hotel-result">
            <h2>
              Best Available Rate
            </h2>

            <div className="hotel-row">
              <span>
                Hotel
              </span>

              <strong>
                {hotel.name}
              </strong>
            </div>

            <div className="hotel-row">
              <span>
                Price
              </span>

              <strong>
                ₹{hotel.price}
              </strong>
            </div>

            <div className="hotel-row">
              <span>
                Supplier
              </span>

              <strong>
                {hotel.supplier}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;