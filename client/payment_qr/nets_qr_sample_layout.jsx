import React, { Component } from "react";
import Button from "@mui/material/Button";
import netsQrInfo from "../../assets/nets_qr_info.png";
import txnLoading from "../../assets/progress_spinner.gif";
import netsQrLogo from "../../assets/nets_qr_logo.png";
import commonConfigs from "../../config";
import axios from "axios";
import { EventSourcePolyfill } from "event-source-polyfill";
import { generateHmac } from "../../hmac_util"; // hmac challenge

class NetsQrSampleLayout extends Component {
  constructor(props) {
    super(props);
    this.state = {
      convertTime: {},
      secondsNetsTimeout: 300, // TODO 8: Total duration before NETS QR transaction timeout (5 minutes)
      amount: "3", // TODO 9: Set amount
      txnId: "sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b", // TODO 10: Refer to 'README.md' file
      mobile: 0, // TODO 11: Set mobile number
      netsQrPayment: txnLoading,
      netsQrRetrievalRef: "",
      netsQrGenerate: false,
      netsQrDisplayLogo: false,
      netsQrResponseCode: "",
      openApiPaasTxnStatus: 0,
      networkCode: "",
      instruction: "",
      errorMsg: "", // Web Developer may input own error messages
      // netsSecretKey: // TODO HMAC Challenge 2: Add the HMAC Challenge secret key from the NETS QR coursework slides guide on NETS Developer Portal
      // hmacChallengeGenerate: // TODO HMAC Challenge 3: Initialize state for displaying generated HMAC
    };
    this.netsTimer = 0;
    this.queryNets = this.queryNets.bind(this);
    this.startNetsTimer = this.startNetsTimer.bind(this);
    this.decrementNetsTimer = this.decrementNetsTimer.bind(this);

    this.isApiCalled = false;
  }
  async requestNets(amount, txnId, mobile) {
    try {
      this.setState({ netsQrGenerate: true });
      var body = {
        txn_id: txnId,
        amt_in_dollars: amount,
        notify_mobile: mobile,
      };

      console.log(body);

      await axios
        .post(commonConfigs.apiUrls.requestNetsApi(), body, {
          headers: commonConfigs.apiHeader,
        })
        .then((res) => {
          console.log(res);
          var resData = res.data.result.data;

          if (
            resData.response_code == "00" &&
            resData.txn_status == 1 &&
            resData.qr_code !== "" &&
            resData.qr_code !== null
          ) {
            localStorage.setItem("txnRetrievalRef", resData.txn_retrieval_ref);
            this.startNetsTimer();
            this.setState({
              netsQrResponseCode: resData.response_code,
              netsQrPayment: "data:image/png;base64," + resData.qr_code,
              netsQrRetrievalRef: resData.txn_retrieval_ref,
              networkCode: resData.network_status,
              openApiPaasTxnStatus: resData.txn_status,
            });
            this.webhookNets();
          } else {
            this.setState({
              netsQrResponseCode:
                resData.response_code === "" ? "N.A." : resData.response_code,
              netsQrPayment: "",
              instruction:
                resData.network_status == 0 ? resData.instruction : "",
              errorMsg:
                resData.network_status !== 0 ? "Frontend Error Message" : "",
              networkCode: resData.network_status,
              openApiPaasTxnStatus: resData.txn_status,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          window.location.href = "/nets-qr/fail";
        });
    } catch (error) {
      this.setState({
        errorMsg: "Error in requestNets",
      });
    } finally {
      this.isApiCalled = false;
    }
  }

  webhookNets() {
    if (this.s2sNetsTxnStatus) {
      this.s2sNetsTxnStatus.close();
    }
    const webhookNetsApiUrl = commonConfigs.apiUrls.webhookNetsApi(
      localStorage.getItem("txnRetrievalRef"),
    );

    try {
      this.s2sNetsTxnStatus = new EventSourcePolyfill(webhookNetsApiUrl, {
        headers: commonConfigs.apiHeader,
        heartbeatTimeout: 150000,
      });

      this.s2sNetsTxnStatus.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        console.log(data.message);
        console.log("Message detected");
        if (data.message === "QR code scanned" && data.response_code === "00") {
          if (this.s2sNetsTxnStatus) {
            this.s2sNetsTxnStatus.close();
          }
          console.log(data);
          window.location.href = "/nets-qr/success";
        } else if (data.message === "Timeout") {
          if (this.s2sNetsTxnStatus) {
            this.s2sNetsTxnStatus.close();
          }
          this.queryNets();
        }
      });
    } catch (error) {
      this.setState({
        errorMsg: "Error in webhookNets",
      });
    } finally {
      // Placeholder
    }
  }

  async queryNets() {
    try {
      var netsTimeoutStatus = 0;
      if (this.state.secondsNetsTimeout == 0) {
        netsTimeoutStatus = 1;
      }

      if (this.state.netsQrRetrievalRef) {
        var body = {
          txn_retrieval_ref: this.state.netsQrRetrievalRef,
          frontend_timeout_status: netsTimeoutStatus,
        };
        console.log(body);
        await axios
          .post(commonConfigs.apiUrls.queryNetsApi(), body, {
            headers: commonConfigs.apiHeader,
          })
          .then((res) => {
            var resData = res.data.result.data;
            console.log(resData);

            if (resData.response_code == "00" && resData.txn_status == 1) {
              window.location.href = "/nets-qr/success";
            } else {
              window.location.href = "/nets-qr/fail";
            }
          })
          .catch((err) => {
            console.log(err);
            window.location.href = "/nets-qr/fail";
          });
      }
    } catch (error) {
      this.setState({
        errorMsg: "Error in queryNets",
      });
    } finally {
      // Placeholder
    }
  }

  startNetsTimer() {
    if (this.netsTimer == 0 && this.state.secondsNetsTimeout > 0) {
      this.netsTimer = setInterval(this.decrementNetsTimer, 1000);
    }
  }
  convertTimeFormat(secs) {
    let minutes = Math.floor(secs / 60);
    let seconds = secs % 60;

    return {
      m: minutes,
      s: seconds,
    };
  }

  decrementNetsTimer() {
    let secondsNetsTimeout = this.state.secondsNetsTimeout - 1;
    this.setState({
      convertTime: this.convertTimeFormat(secondsNetsTimeout),
      secondsNetsTimeout: secondsNetsTimeout,
    });

    if (secondsNetsTimeout == 0) {
      clearInterval(this.netsTimer);
    }
  }

  handleNetsReq() {
    if (!this.isApiCalled) {
      this.isApiCalled = true;
      this.requestNets(this.state.amount, this.state.txnId, this.state.mobile);
      this.setState({ netsQrDisplayLogo: true });
      document.getElementById("btnNets").style.display = "none";
    }
  }

  handleNetsCancel() {
    this.setState(
      {
        netsQrRetrievalRef: "",
      },
      () => window.location.reload(false),
    );
    this.setState({ netsQrDisplayLogo: false });
  }

  handleHmacChallenge() {
    // TODO HMAC Challenge 4: Fill in code for handle HMAC Challenge function
  }

  render() {
    return (
      <div style={{ position: "relative" }}>
        <div style={{ margin: "50px" }}>
          <div style={{ margin: "50px" }}>
            <div
              className="content"
              style={{
                marginTop: "10%",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: 0,
                height: "80vh",
                backgroundColor: "#f0f4f7",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                padding: "20px",
              }}
            >
              <div
                className="button"
                id="btnNets"
                style={{ marginTop: "20px" }}
              >
                {!this.state.netsQrDisplayLogo && (
                  <img
                    src={netsQrLogo}
                    alt="NETS QR Logo"
                    style={{ top: "100px", height: "150px" }}
                  />
                )}
                <h2 className="text" style={{ fontSize: "18px" }}>
                  Sample NETS QR
                </h2>
                <Button
                  variant="contained"
                  sx={{ width: 300 }}
                  style={{
                    backgroundColor: "dodgerblue",
                    borderRadius: "10px",
                    fontSize: "14px",
                    textDecoration: "none",
                    height: "50px",
                  }}
                  onClick={() => this.handleNetsReq()} // TODO HMAC Challenge 5: Change onClick handler for HMAC Challenge
                >
                  Generate NETS QR{" "}
                  {/* TODO HMAC Challenge 6: Change button name for HMAC Challenge */}
                </Button>
              </div>

              {this.state.instruction === "" &&
              this.state.errorMsg === "" &&
              this.state.netsQrGenerate === true ? (
                <div className="netsQrPaymentGatewayWebpage">
                  <h2
                    className="text"
                    style={{
                      fontSize: "20px",
                      marginBottom: "10px",
                      marginTop: "20px",
                    }}
                  >
                    SCAN TO PAY
                  </h2>
                  <p
                    className="text"
                    style={{ fontSize: "18px", fontWeight: "300" }}
                  >
                    Scan with your bank app to complete your payment
                  </p>
                  <span>
                    {this.state.netsQrPayment !== ""}
                    <div id="netsQrPayment" className="netsQrCode">
                      <img
                        id="imgNetsQr"
                        height="auto"
                        width="30%"
                        src={this.state.netsQrPayment}
                      />
                    </div>
                    <h2 className="netsTimer" style={{ fontSize: "16px" }}>
                      {this.state.convertTime.m} : {this.state.convertTime.s}
                    </h2>
                  </span>
                  <img
                    id="netsQrInfo"
                    height="auto"
                    width="40%"
                    src={netsQrInfo}
                  />
                  <div
                    className="button"
                    id="btnCancel"
                    style={{ marginTop: "20px" }}
                  >
                    <Button
                      variant="contained"
                      sx={{ width: 300 }}
                      style={{
                        backgroundColor: "#E02020",
                        borderRadius: "10px",
                        fontSize: "14px",
                        textDecoration: "none",
                        height: "50px",
                      }}
                      onClick={() => this.handleNetsCancel()}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="netsQrPaymentGatewayWebpage">
                  {this.state.netsQrResponseCode !== "00" &&
                    this.state.netsQrResponseCode !== "" &&
                    this.state.openApiPaasTxnStatus !== 1 && (
                      <>
                        <h2
                          className="text"
                          style={{ fontSize: "42px", marginBottom: "10px" }}
                        >
                          NETS Response Code: {this.state.netsQrResponseCode}
                        </h2>
                        {this.state.instruction !== "" ||
                        this.state.errorMsg !== "" ? (
                          <>
                            <h2 className="text" style={{ fontSize: "42px" }}>
                              {this.state.instruction}
                            </h2>
                            <h2 className="text" style={{ fontSize: "42px" }}>
                              {this.state.errorMsg}
                            </h2>
                          </>
                        ) : (
                          <h2
                            className="text"
                            style={{ fontSize: "42px", marginBottom: "10px" }}
                          >
                            Default Error Message
                          </h2>
                        )}
                        <Button
                          variant="contained"
                          sx={{ width: 300 }}
                          style={{
                            backgroundColor: "#E02020",
                            borderRadius: "10px",
                            fontSize: "14px",
                            textDecoration: "none",
                            height: "50px",
                            marginTop: "30px",
                          }}
                          onClick={() => this.handleNetsCancel()}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                </div>
              )}
              {/* For HMAC Challenge */}
              {this.state.hmacChallengeGenerate &&
                this.state.hmacChallengeGenerate !== "" && (
                  <>
                    <div className="hmacChallenge">
                      <h2
                        className="text"
                        style={{ fontSize: "42px", marginBottom: "10px" }}
                      >
                        Generated HMAC
                      </h2>
                      <h2
                        className="text"
                        style={{ fontSize: "22px", marginBottom: "10px" }}
                      >
                        (Compare with NETS Developer Portal HMAC)
                      </h2>
                      <p style={{ fontSize: "22px" }}>
                        {this.state.hmacChallengeGenerate}
                      </p>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default NetsQrSampleLayout;
