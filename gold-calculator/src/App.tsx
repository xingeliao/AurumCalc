import React, { useState, useEffect } from "react";
import axios from "axios";
import SimpleGLSLBackground from "./SimpleGLSLBackground";


const API_URL = "https://r1dwp1ddgg.execute-api.us-east-2.amazonaws.com/";

// Interface for a single calculation entry
interface GoldEntry {
    id: number;
    weight: string;
    totalAmount: string;
    pricePerGram: number | null;
    commissionRate: number | null;
}

const App: React.FC = () => {
    // Add body background color
    useEffect(() => {
        document.body.style.backgroundColor = "#e0f2f1";

        // Cleanup when component unmounts
        return () => {
            document.body.style.backgroundColor = "";
        };
    }, []);
    const [goldPrice, setGoldPrice] = useState<number | null>(null);
    // Initialize with 5 empty entries
    const [entries, setEntries] = useState<GoldEntry[]>(
        Array(5).fill(null).map((_, index) => ({
            id: index + 1,
            weight: "",
            totalAmount: "",
            pricePerGram: null,
            commissionRate: null
        }))
    );

    useEffect(() => {
        axios.get(API_URL)
            .then(response => {
                console.log("API response:", response.data);
                setGoldPrice(response.data.goldPrice);
            })
            .catch(error => console.error("Error fetching gold price:", error));
    }, []);

    const addNewEntry = () => {
        const newEntry: GoldEntry = {
            id: entries.length + 1,
            weight: "",
            totalAmount: "",
            pricePerGram: null,
            commissionRate: null
        };
        setEntries([...entries, newEntry]);
    };

    const removeEntry = (id: number) => {
        if (entries.length > 1) {
            const updatedEntries = entries.filter(entry => entry.id !== id);
            // Re-assign IDs to keep them sequential
            const renumberedEntries = updatedEntries.map((entry, index) => ({
                ...entry,
                id: index + 1
            }));
            setEntries(renumberedEntries);
        }
    };

    const updateEntry = (id: number, field: keyof GoldEntry, value: string) => {
        const updatedEntries = entries.map(entry => {
            if (entry.id === id) {
                const updatedEntry = { ...entry, [field]: value };

                // If both weight and totalAmount are present, auto-calculate pricePerGram
                if (field === 'weight' || field === 'totalAmount') {
                    const weight = field === 'weight' ? value : entry.weight;
                    const totalAmount = field === 'totalAmount' ? value : entry.totalAmount;

                    if (weight && totalAmount) {
                        const weightNum = parseFloat(weight);
                        const totalAmountNum = parseFloat(totalAmount);

                        if (weightNum > 0 && totalAmountNum > 0) {
                            const pricePerGram = totalAmountNum / weightNum;
                            updatedEntry.pricePerGram = pricePerGram;

                            // Calculate commission rate if goldPrice is available
                            if (goldPrice && goldPrice > 0) {
                                const commissionRate = ((pricePerGram - goldPrice) / goldPrice) * 100;
                                updatedEntry.commissionRate = commissionRate;
                            }
                        }
                    }
                }

                return updatedEntry;
            }
            return entry;
        });

        setEntries(updatedEntries);
    };

    return (
        <div style={{
            maxWidth: "800px",
            margin: "30px auto",
            padding: "20px",
            fontFamily: "Arial, sans-serif",
            backgroundColor: "#f5f5f5",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
        }}>
            <h1 style={{ textAlign: "center", marginBottom: "20px" }}>Gold Price Calculator</h1>
            <div style={{
                padding: "10px",
                marginBottom: "20px",
                backgroundColor: "#f8f8f8",
                borderRadius: "5px",
                textAlign: "center"
            }}>
                <h3>Current 24K Gold Price: {goldPrice ? `$${goldPrice.toFixed(2)}/g` : "Loading..."}</h3>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>#</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Weight (g)</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Total Amount ($)</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Price per Gram</th>
                        <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Commission %</th>
                        <th style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {entries.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "8px" }}>{entry.id}</td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    value={entry.weight}
                                    onChange={(e) => updateEntry(entry.id, "weight", e.target.value)}
                                    style={{ width: "80px", padding: "6px", borderRadius: "3px", border: "1px solid #ddd" }}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                <input
                                    type="number"
                                    value={entry.totalAmount}
                                    onChange={(e) => updateEntry(entry.id, "totalAmount", e.target.value)}
                                    style={{ width: "80px", padding: "6px", borderRadius: "3px", border: "1px solid #ddd" }}
                                />
                            </td>
                            <td style={{ padding: "8px" }}>
                                {entry.pricePerGram ? `$${entry.pricePerGram.toFixed(2)}` : "-"}
                            </td>
                            <td style={{ padding: "8px" }}>
                                {entry.commissionRate ? `${entry.commissionRate.toFixed(2)}%` : "-"}
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                                <button
                                    onClick={() => removeEntry(entry.id)}
                                    style={{
                                        backgroundColor: "#ff4d4d",
                                        color: "white",
                                        border: "none",
                                        padding: "4px 8px",
                                        borderRadius: "3px",
                                        cursor: "pointer",
                                        fontSize: "12px"
                                    }}
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                <button
                    onClick={addNewEntry}
                    style={{
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "3px",
                        cursor: "pointer"
                    }}
                >
                    Add New Entry
                </button>
            </div>

            <div style={{
                marginTop: "30px",
                padding: "15px",
                backgroundColor: "#e6f7ff",
                borderRadius: "5px",
                border: "1px solid #91d5ff"
            }}>
                <h3 style={{ margin: "0 0 10px 0" }}>Commission Rate Formula</h3>
                <p style={{ margin: "5px 0" }}>
                    Commission Rate = ((Price per Gram - Current Gold Price) / Current Gold Price) × 100%
                </p>
                <p style={{ margin: "5px 0", fontStyle: "italic" }}>
                    Example: If Price per Gram = $100 and Current Gold Price = $92.76, then<br/>
                    Commission Rate = ((100 - 92.76) / 92.76) × 100% = 7.8%
                </p>
            </div>
        </div>
    );
};

export default App;