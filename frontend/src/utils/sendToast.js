import { toastResponse } from "./toastResponse";
//Jayden
//This function is written to simplify toast handling, such that a try catch everytime is not required.
// Try catch is done internally
export async function sendToast(toast, promise) {
  try {
    const res = await promise;
    toastResponse(toast, res);
    return res;
  } catch (err) {
    if (err.response?.data) {
      toastResponse(toast, { data: err.response.data });
    } else {
      toastResponse(toast, null, "Network or server error");
    }
    throw err;
  }
}
