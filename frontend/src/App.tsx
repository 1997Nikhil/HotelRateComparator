import {
  useEffect,
  useState,
} from "react";

import {
  startHotelSearch,
  getHotelSearchStatus,
  cancelHotelSearch,
  type Hotel,
  type SupplierStatus,
} from "./services/api";

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

  const [suppliers, setSuppliers] =
    useState<SupplierStatus[]>([]);

  const [workflowId, setWorkflowId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /**
   * ========================================
   * START SEARCH
   * ========================================
   */
  const handleSubmit = async (
    event: React.FormEvent
  ) => {

    event.preventDefault();

    setLoading(true);

    setError("");

    setHotel(null);

    setSuppliers([]);

    setMessage("");

    try {

      const result =
        await startHotelSearch({

          city,

          checkIn,

          checkOut,

        });

      setWorkflowId(
        result.workflowId
      );

      setMessage(
        "Searching hotel suppliers..."
      );

    } catch (error) {

      console.error(error);

      setError(
        "Failed to start hotel search. Please try again."
      );

      setLoading(false);
    }
  };

  /**
   * ========================================
   * POLL TEMPORAL WORKFLOW
   * ========================================
   */
  useEffect(() => {

    if (!workflowId) {
      return;
    }

    let stopped = false;

    const pollWorkflow =
      async () => {

        try {

          const result =
            await getHotelSearchStatus(
              workflowId
            );

          if (stopped) {
            return;
          }

          /**
           * Workflow still running
           */
          if (
            result.status ===
            "RUNNING"
          ) {

            setLoading(true);

            setMessage(
              "Searching Supplier A and Supplier B..."
            );

            return;
          }

          /**
           * Workflow completed
           */
          if (
            result.status ===
            "COMPLETED"
          ) {

            setLoading(false);

            /**
             * Cheapest hotel
             */
            setHotel(
              result.hotel
            );

            /**
             * ALL supplier results
             */
            setSuppliers(
              result.suppliers || []
            );

            setMessage(
              result.message
            );

            /**
             * Stop polling
             */
            setWorkflowId("");

            return;
          }

          /**
           * Workflow cancelled
           */
          if (
            result.status ===
            "CANCELLED"
          ) {

            setLoading(false);

            setHotel(null);

            setSuppliers([]);

            setMessage(
              "Hotel search was cancelled."
            );

            setWorkflowId("");

            return;
          }

          /**
           * Workflow failed
           */
          if (
            result.status ===
            "FAILED"
          ) {

            setLoading(false);

            setError(
              result.message ||
                "Hotel search failed."
            );

            setWorkflowId("");

            return;
          }

        } catch (error) {

          console.error(error);

          if (!stopped) {

            setLoading(false);

            setError(
              "Unable to get search status."
            );

            setWorkflowId("");
          }
        }
      };

    /**
     * Check immediately
     */
    pollWorkflow();

    /**
     * Then every second
     */
    const interval =
      setInterval(
        pollWorkflow,
        1000
      );

    /**
     * Cleanup
     */
    return () => {

      stopped = true;

      clearInterval(interval);

    };

  }, [workflowId]);

  /**
   * ========================================
   * CANCEL SEARCH
   * ========================================
   */
  const handleCancel = async () => {

    if (!workflowId) {
      return;
    }

    try {

      setMessage(
        "Cancelling search..."
      );

      await cancelHotelSearch(
        workflowId
      );

    } catch (error) {

      console.error(error);

      setError(
        "Unable to cancel search."
      );
    }
  };

  /**
   * ========================================
   * RENDER
   * ========================================
   */
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

        {/* ==========================
            SEARCH FORM
        =========================== */}

        <form
          onSubmit={handleSubmit}
        >

          {/* CITY */}

          <div className="form-group">

            <label>
              City
            </label>

            <input
              type="text"
              placeholder="Enter city"
              value={city}
              onChange={(e) =>
                setCity(e.target.value)
              }
              required
            />

          </div>

          {/* CHECK-IN */}

          <div className="form-group">

            <label>
              Check-in Date
            </label>

            <input
              type="date"
              value={checkIn}
              onChange={(e) =>
                setCheckIn(e.target.value)
              }
              required
            />

          </div>

          {/* CHECK-OUT */}

          <div className="form-group">

            <label>
              Check-out Date
            </label>

            <input
              type="date"
              value={checkOut}
              onChange={(e) =>
                setCheckOut(e.target.value)
              }
              required
            />

          </div>

          {/* SEARCH BUTTON */}

          <button
            type="submit"
            disabled={loading}
          >

            {loading
              ? "Searching..."
              : "Search Hotels"}

          </button>

        </form>

        {/* ==========================
            CANCEL BUTTON
        =========================== */}

        {loading &&
          workflowId && (

            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
            >

              Cancel Search

            </button>

          )}

        {/* ==========================
            MESSAGE
        =========================== */}

        {message && (

          <div className="message">
            {message}
          </div>

        )}

        {/* ==========================
            ERROR
        =========================== */}

        {error && (

          <div className="error">
            {error}
          </div>

        )}

        {/* ==========================
            SUPPLIER RESULTS
        =========================== */}

        {suppliers.length > 0 && (

          <div className="supplier-results">

            <h2>
              Supplier Results
            </h2>

            <div className="supplier-grid">

              {suppliers.map(
                (supplier) => (

                  <div
                    key={
                      supplier.supplier
                    }
                    className={`supplier-card ${supplier.status.toLowerCase()}`}
                  >

                    {/* SUPPLIER HEADER */}

                    <div className="supplier-header">

                      <h3>
                        {supplier.supplier}
                      </h3>

                      <span
                        className="supplier-status"
                      >

                        {supplier.status ===
                          "SUCCESS" &&
                          "✅ SUCCESS"}

                        {supplier.status ===
                          "FAILED" &&
                          "❌ FAILED"}

                        {supplier.status ===
                          "TIMEOUT" &&
                          "⏱ TIMEOUT"}

                        {supplier.status ===
                          "EMPTY" &&
                          "⚠️ EMPTY"}

                      </span>

                    </div>

                    {/* SUCCESSFUL HOTELS */}

                    {supplier.status ===
                      "SUCCESS" && (

                      <div>

                        {supplier.hotels.map(
                          (hotel) => (

                            <div
                              key={
                                hotel.hotelId
                              }
                              className="supplier-hotel"
                            >

                              <div>

                                <strong>
                                  {hotel.name}
                                </strong>

                                <small>
                                  {hotel.hotelId}
                                </small>

                              </div>

                              <strong>
                                ₹{hotel.price}
                              </strong>

                            </div>

                          )
                        )}

                      </div>

                    )}

                    {/* FAILED / TIMEOUT */}

                    {(supplier.status ===
                      "FAILED" ||
                      supplier.status ===
                      "TIMEOUT") && (

                      <div className="supplier-error">

                        {supplier.error ||
                          "Supplier request failed"}

                      </div>

                    )}

                    {/* EMPTY */}

                    {supplier.status ===
                      "EMPTY" && (

                      <div className="supplier-empty">

                        No hotels returned
                        by this supplier.

                      </div>

                    )}

                  </div>

                )
              )}

            </div>

          </div>

        )}

        {/* ==========================
            BEST HOTEL
        =========================== */}

        {hotel && (

          <div className="hotel-result">

            <h2>
              🏆 Best Available Rate
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