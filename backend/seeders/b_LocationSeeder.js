"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("locations", [
      // Gauteng
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Corner of Lynnwood Rd & Roper St, Hatfield, Pretoria",
        latitude: -25.7564,
        longitude: 28.2314,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Hilda Street, Hatfield, Pretoria",
        latitude: -25.754512,
        longitude: 28.23548,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Jan Shoba Street, Brooklyn, Pretoria",
        latitude: -25.759113,
        longitude: 28.238425,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Nelson Mandela Square, Sandton, Johannesburg",
        latitude: -26.1076,
        longitude: 28.0567,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Vilakazi Street, Soweto, Johannesburg",
        latitude: -26.236,
        longitude: 27.9333,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Western Cape
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Long Street, Cape Town City Centre, Cape Town",
        latitude: -33.9249,
        longitude: 18.4232,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "V&A Waterfront, Cape Town",
        latitude: -33.9061,
        longitude: 18.4208,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Stellenbosch University, Stellenbosch",
        latitude: -33.9344,
        longitude: 18.8675,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // KwaZulu-Natal
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Florida Road, Morningside, Durban",
        latitude: -29.8393,
        longitude: 31.0218,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "uShaka Marine World, Durban Point",
        latitude: -29.8686,
        longitude: 31.0457,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Eastern Cape
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Donkin Reserve, Central, Gqeberha (Port Elizabeth)",
        latitude: -33.9608,
        longitude: 25.6022,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Nahoon Beach, East London",
        latitude: -32.9739,
        longitude: 27.9448,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Free State
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Naval Hill, Bloemfontein",
        latitude: -29.0966,
        longitude: 26.2246,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Limpopo
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Polokwane City Centre, Polokwane",
        latitude: -23.9015,
        longitude: 29.4553,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // North West
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Sun City Resort, Pilanesberg",
        latitude: -25.3472,
        longitude: 27.097,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Mpumalanga
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "God’s Window, Graskop, Mpumalanga",
        latitude: -24.8742,
        longitude: 30.8904,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Kruger National Park Gate, Nelspruit",
        latitude: -25.3833,
        longitude: 31.0167,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      // Northern Cape
      {
        token: Sequelize.Utils.toDefaultValue(Sequelize.UUIDV4()),
        address: "Big Hole, Kimberley",
        latitude: -28.7381,
        longitude: 24.7631,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("locations", null, {});
  },
};
