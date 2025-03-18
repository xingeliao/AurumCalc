import axios from "axios";

export const handler = async (event) => {
    try {
        const API_KEY = process.env.GOLD_API_KEY;
        const response = await axios.get("https://www.goldapi.io/api/XAU/USD", {
            headers: {
                "x-access-token": API_KEY,
                "Content-Type": "application/json"
            }
        });
        const goldPrice = response.data.price_gram_24k;
        return {
            statusCode: 200,
            body: JSON.stringify({ goldPrice })
        };
    } catch (error) {
        console.error("Error details:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Failed to fetch gold price",
                message: error.message
            })
        };
    }
};