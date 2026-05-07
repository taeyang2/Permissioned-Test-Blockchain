import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ContentLineage", (m) => {
  const deployer = m.getAccount(0);

  const acl = m.contract("ContentAccessControl", [deployer], {
    id: "acl",
    from: deployer,
  });

  const registrarRegistry = m.contract("RegistrarRegistry", [acl], {
    id: "registrarRegistry",
    from: deployer,
    after: [acl],
  });

  const adminRole = m.staticCall(acl, "ADMIN_ROLE", [], 0, {
    id: "adminRole",
    from: deployer,
    after: [acl],
  });

  const grantRegistrarRegistryAdminRole = m.call(
    acl,
    "grantRole",
    [adminRole, registrarRegistry],
    {
      id: "grantRegistrarRegistryAdminRole",
      from: deployer,
      after: [adminRole, registrarRegistry],
    },
  );

  const contentRegistry = m.contract("ContentRegistry", [acl, registrarRegistry], {
    id: "contentRegistry",
    from: deployer,
    after: [acl, registrarRegistry],
  });

  const addInitialRegistrar = m.call(
    registrarRegistry,
    "addRegistrar",
    [deployer, "DigiCAP"],
    {
      id: "addInitialRegistrar",
      from: deployer,
      after: [grantRegistrarRegistryAdminRole, contentRegistry],
    },
  );

  return {
    acl,
    registrarRegistry,
    contentRegistry,
  };
});
