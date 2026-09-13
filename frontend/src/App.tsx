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
  type WorkflowStep,
} from "./services/api";

import "./App.css";

function App() {
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [hotel, setHotel] =
    useState<Hotel | null>(null);

  const [suppliers, setSuppliers] =
    useState<SupplierStatus[]>([]);

  const [workflowSteps, setWorkflowSteps] =
    useState<WorkflowStep[]>([]);

  const [workflowId, setWorkflowId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /*
   * --------------------------------------------------
   * Start Search
   * --------------------------------------------------
   */

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setHotel(null);
    setSuppliers([]);
    setWorkflowSteps([]);
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
        "Starting Temporal workflow..."
      );
    } catch (error) {
      console.error(error);

      setError(
        "Failed to start hotel search. Please try again."
      );

      setLoading(false);
    }
  };

  /*
   * --------------------------------------------------
   * Poll Temporal Workflow
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    let stopped = false;

    const pollWorkflow = async () => {
      try {
        const result =
          await getHotelSearchStatus(
            workflowId
          );

        if (stopped) {
          return;
        }

        /*
         * ------------------------------------------
         * RUNNING
         * ------------------------------------------
         */

        if (
          result.status === "RUNNING"
        ) {
          setLoading(true);

          setMessage(
            "Temporal workflow is running..."
          );

          /*
           * This is the important part.
           *
           * We receive the current Temporal
           * workflow state.
           */
          setWorkflowSteps(
            result.workflowSteps || []
          );

          return;
        }

        /*
         * ------------------------------------------
         * COMPLETED
         * ------------------------------------------
         */

        if (
          result.status === "COMPLETED"
        ) {
          setLoading(false);

          setHotel(
            result.hotel
          );

          setSuppliers(
            result.suppliers || []
          );

          setWorkflowSteps(
            result.workflowSteps || []
          );

          setMessage(
            result.message
          );

          setWorkflowId("");

          return;
        }

        /*
         * ------------------------------------------
         * CANCELLED
         * ------------------------------------------
         */

        if (
          result.status === "CANCELLED"
        ) {
          setLoading(false);

          setHotel(null);

          setSuppliers([]);

          setWorkflowSteps([]);

          setMessage(
            "Hotel search was cancelled."
          );

          setWorkflowId("");

          return;
        }

        /*
         * ------------------------------------------
         * FAILED
         * ------------------------------------------
         */

        if (
          result.status === "FAILED"
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

    /*
     * Immediately check once.
     */
    pollWorkflow();

    /*
     * Then check every second.
     */
    const interval =
      setInterval(
        pollWorkflow,
        1000
      );

    return () => {
      stopped = true;

      clearInterval(interval);
    };
  }, [workflowId]);

  /*
   * --------------------------------------------------
   * Cancel Search
   * --------------------------------------------------
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

  /*
   * --------------------------------------------------
   * Workflow Status Helper
   * --------------------------------------------------
   */

  const getWorkflowIcon = (
    status: WorkflowStep["status"]
  ) => {
    switch (status) {
      case "PENDING":
        return "○";

      case "RUNNING":
        return "⏳";

      case "COMPLETED":
        return "✓";

      case "FAILED":
        return "✕";

      case "TIMEOUT":
        return "⏱";

      default:
        return "○";
    }
  };

  /*
   * --------------------------------------------------
   * Render
   * --------------------------------------------------
   */

  return (
    <div className="container">
      <div className="card">

        <h1>
          Hotel Rate Comparator
        </h1>

        <p className="subtitle">
          Find the best hotel price from
          multiple suppliers
        </p>

        {/* =========================================
            SEARCH FORM
        ========================================= */}

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
              onChange={(event) =>
                setCity(
                  event.target.value
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
              onChange={(event) =>
                setCheckIn(
                  event.target.value
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
              onChange={(event) =>
                setCheckOut(
                  event.target.value
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

        {/* =========================================
            CANCEL
        ========================================= */}

        {loading &&
          workflowId && (
            <button
              type="button"
              className="cancel-button"
              onClick={
                handleCancel
              }
            >
              Cancel Search
            </button>
          )}

        {/* =========================================
            MESSAGE / ERROR
        ========================================= */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* =========================================
            TEMPORAL WORKFLOW VISUALIZATION
        ========================================= */}

        {workflowSteps.length >
          0 && (
          <div className="workflow-section">

            <div className="workflow-title">
              <h2>
                ⚙️ Temporal Workflow
              </h2>

              {loading && (
                <span className="live-badge">
                  LIVE
                </span>
              )}
            </div>

            {/* Search Request */}

            {workflowSteps
              .filter(
                (step) =>
                  step.id ===
                  "search-request"
              )
              .map((step) => (
                <div
                  key={step.id}
                  className={`workflow-main-node ${step.status.toLowerCase()}`}
                >
                  <div className="workflow-icon">
                    {getWorkflowIcon(
                      step.status
                    )}
                  </div>

                  <div className="workflow-content">
                    <strong>
                      {step.name}
                    </strong>

                    <span>
                      {step.description}
                    </span>

                    <small>
                      {step.status}
                    </small>
                  </div>
                </div>
              ))}

            <div className="workflow-arrow">
              ↓
            </div>

            {/* Temporal Workflow */}

            {workflowSteps
              .filter(
                (step) =>
                  step.id ===
                  "temporal-workflow"
              )
              .map((step) => (
                <div
                  key={step.id}
                  className={`workflow-main-node ${step.status.toLowerCase()}`}
                >
                  <div className="workflow-icon">
                    {getWorkflowIcon(
                      step.status
                    )}
                  </div>

                  <div className="workflow-content">
                    <strong>
                      {step.name}
                    </strong>

                    <span>
                      {step.description}
                    </span>

                    <small>
                      {step.status}
                    </small>
                  </div>
                </div>
              ))}

            <div className="workflow-arrow">
              ↓
            </div>

            {/* =================================
                SUPPLIERS - PARALLEL
            ================================= */}

            <div className="supplier-workflow-row">

              {workflowSteps
                .filter(
                  (step) =>
                    step.id ===
                    "supplier-a"
                )
                .map((step) => (
                  <div
                    key={step.id}
                    className={`workflow-supplier-node ${step.status.toLowerCase()}`}
                  >
                    <div className="workflow-icon">
                      {getWorkflowIcon(
                        step.status
                      )}
                    </div>

                    <div className="workflow-content">
                      <strong>
                        {step.name}
                      </strong>

                      <span>
                        {step.description}
                      </span>

                      <small>
                        {step.status}
                      </small>
                    </div>
                  </div>
                ))}

              <div className="parallel-symbol">
                +
              </div>

              {workflowSteps
                .filter(
                  (step) =>
                    step.id ===
                    "supplier-b"
                )
                .map((step) => (
                  <div
                    key={step.id}
                    className={`workflow-supplier-node ${step.status.toLowerCase()}`}
                  >
                    <div className="workflow-icon">
                      {getWorkflowIcon(
                        step.status
                      )}
                    </div>

                    <div className="workflow-content">
                      <strong>
                        {step.name}
                      </strong>

                      <span>
                        {step.description}
                      </span>

                      <small>
                        {step.status}
                      </small>
                    </div>
                  </div>
                ))}
            </div>

            <div className="workflow-parallel-label">
              Supplier A and Supplier B run in parallel
            </div>

            <div className="workflow-arrow">
              ↓
            </div>

            {/* Compare Rates */}

            {workflowSteps
              .filter(
                (step) =>
                  step.id ===
                  "compare-rates"
              )
              .map((step) => (
                <div
                  key={step.id}
                  className={`workflow-main-node ${step.status.toLowerCase()}`}
                >
                  <div className="workflow-icon">
                    {getWorkflowIcon(
                      step.status
                    )}
                  </div>

                  <div className="workflow-content">
                    <strong>
                      {step.name}
                    </strong>

                    <span>
                      {step.description}
                    </span>

                    <small>
                      {step.status}
                    </small>
                  </div>
                </div>
              ))}

            <div className="workflow-arrow">
              ↓
            </div>

            {/* Best Rate */}

            {workflowSteps
              .filter(
                (step) =>
                  step.id ===
                  "best-rate"
              )
              .map((step) => (
                <div
                  key={step.id}
                  className={`workflow-main-node best-rate-workflow ${step.status.toLowerCase()}`}
                >
                  <div className="workflow-icon">
                    {getWorkflowIcon(
                      step.status
                    )}
                  </div>

                  <div className="workflow-content">
                    <strong>
                      {step.name}
                    </strong>

                    <span>
                      {step.description}
                    </span>

                    <small>
                      {step.status}
                    </small>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* =========================================
            SUPPLIER RESULTS
        ========================================= */}

        {suppliers.length >
          0 && (
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

                    <div className="supplier-header">

                      <h3>
                        {
                          supplier.supplier
                        }
                      </h3>

                      <span className="supplier-status">

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
                                  {
                                    hotel.name
                                  }
                                </strong>

                                <small>
                                  {
                                    hotel.hotelId
                                  }
                                </small>
                              </div>

                              <strong>
                                ₹
                                {
                                  hotel.price
                                }
                              </strong>

                            </div>
                          )
                        )}

                      </div>
                    )}

                    {(supplier.status ===
                      "FAILED" ||
                      supplier.status ===
                        "TIMEOUT") && (
                      <div className="supplier-error">
                        {supplier.error ||
                          "Supplier request failed"}
                      </div>
                    )}

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

        {/* =========================================
            BEST RATE
        ========================================= */}

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