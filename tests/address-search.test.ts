import assert from "node:assert/strict";
import test from "node:test";
import { addressSuggestionToValue, parsePhotonAddress } from "../lib/address-search";

test("autocomplete preserves NZ street, unit, locality and postcode details", () => {
  const result = parsePhotonAddress({ countrycode: "NZ", housenumber: "2/10", street: "Queen Street", district: "City Centre", city: "Auckland", state: "Auckland", postcode: "1010" });
  assert.deepEqual(result, { label: "2/10 Queen Street, City Centre, Auckland, 1010, New Zealand", street: "2/10 Queen Street", suburb: "City Centre", city: "Auckland", region: "Auckland", postcode: "1010", country: "New Zealand", provider: "openstreetmap" });
  assert.equal(addressSuggestionToValue(result!), "2/10 Queen Street");
});

test("partial street matches do not invent a house number", () => {
  const result = parsePhotonAddress({ countrycode: "nz", type: "street", name: "Queen Street", city: "Auckland" });
  assert.equal(result?.street, "Queen Street");
  assert.equal(result?.label, "Queen Street, Auckland, New Zealand");
});

test("city and region searches retain the location being selected", () => {
  const city = parsePhotonAddress({ countrycode: "NZ", type: "city", name: "Auckland", city: "Waitematā", state: "Auckland" });
  assert.equal(city?.city, "Auckland");
  assert.equal(city?.label, "Auckland, New Zealand");
  const region = parsePhotonAddress({ countrycode: "NZ", type: "state", name: "Waikato" });
  assert.equal(region?.region, "Waikato");
});

test("foreign, empty and malformed provider records cannot become NZ suggestions", () => {
  assert.equal(parsePhotonAddress({ countrycode: "AU", name: "Queen Street" }), null);
  assert.equal(parsePhotonAddress({ countrycode: "NZ" }), null);
  assert.equal(parsePhotonAddress({ countrycode: 123, name: "Queen Street" }), null);
  assert.equal(parsePhotonAddress({ countrycode: "NZ", name: { value: "Queen Street" } }), null);
});
