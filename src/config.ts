import dotenv from "dotenv";
dotenv.config();

const CHATS = [
    {
        name: "ClearEdge",
        id: "-1002890154374",
    },
    {
        name: "ClearEdge Discussion",
        id: "-1002733236639",
    },
    {
        name: "Goated Entry Group",
        id: "-1002402595126",
    },
    {
        name: "Goated Entry Group Discussion",
        id: "-1002404830718",
    },
    {
        name: "Anteater",
        id: "-1002019095590",
    },
    {
        name: "Anteater Discussion",
        id: "-1002230239373",
    },
    {
        name: "Cheshire Capital",
        id: "-1002561725434",
    },
    {
        name: "Cheshire Capital Discussion",
        id: "-1002565453000",
    },
    {
        name: "0xEnas",
        id: "-1002272160911",
    },
    {
        name: "y22",
        id: "-1002325165654",
    },
    {
        name: "mlm",
        id: "-1002677926273",
    },
    {
        name: "gev5",
        id: "-1002438696537",
    },
];

export const config = {
    telegram: {
        apiId: parseInt(process.env.API_ID || "0"),
        apiHash: process.env.API_HASH || "",
        sessionString: process.env.SESSION_STRING || "",
    },
    chats: CHATS,
};
