import nock from "nock";
import _ from "lodash";
import axios from "axios";
import nockRestApi, { Response } from "../src";

describe("rest-api", () => {
  beforeEach(() => {});
  afterEach(() => {
    nock.cleanAll();
  });

  it("should return 204 by default when there is no payload", async () => {
    nockRestApi("http://localhost:4001")
      .get("/api/products/{id}")
      .reply((): Response => ({}));

    const response = await axios.get("http://localhost:4001/api/products/1");

    expect(response.status).toEqual(204);
  });

  it("should expose url using path variable", async () => {
    const products = [
      { id: "1", name: "Nail" },
      { id: "2", name: "Hammer" },
      { id: "3", name: "Screwdriver" }
    ];
    const scope = nockRestApi("http://localhost:4001")
      .get("/api/products/{id}")
      .reply(
        (params: any): Response => {
          return {
            payload: _.find(products, ["id", params.id])
          };
        }
      );

    const response = await axios.get("http://localhost:4001/api/products/1");

    expect(response.data).toEqual({ id: "1", name: "Nail" });
    expect(scope.forParams({ id: "1" }).times()).toBe(1);
    expect(scope.notForParams({ id: "1" }).urls()).toEqual([]);
  });

  it("should expose url using query variable", async () => {
    const products = [
      { id: "1", name: "Nail", category: "material" },
      { id: "2", name: "Hammer", category: "tool" },
      { id: "3", name: "Screwdriver", category: "tool" }
    ];
    const scope = nockRestApi("http://localhost:4001")
      .get("/api/products{?category}")
      .replyOnce(
        (params: any): any => {
          return {
            payload: params.category
              ? products.filter(
                  (product: any) => product.category === params.category
                )
              : products
          };
        }
      );

    const response = await axios.get(
      "http://localhost:4001/api/products?category=tool"
    );

    expect(response.data.length).toBe(2);
    expect(response.data[0]).toEqual({
      id: "2",
      name: "Hammer",
      category: "tool"
    });
    expect(response.data[1]).toEqual({
      id: "3",
      name: "Screwdriver",
      category: "tool"
    });
    expect(scope.forParams({ category: "tool" }).times()).toBe(1);
  });

  it("should match the right url when declaring multiple nested urls", async () => {
    const scopeProduct = nockRestApi("http://localhost:4001")
      .get("/api/products/{id}")
      .replyOnce(() => {
        return {
          payload: { id: "1", name: "product1" }
        };
      });
    const scopeCategories = nockRestApi("http://localhost:4001")
      .get("/api/products/{id}/categories")
      .replyOnce(() => {
        return {
          payload: [{ name: "cat1" }, { name: "cat2" }]
        };
      });

    const response = await axios.get(
      "http://localhost:4001/api/products/1/categories"
    );

    expect(scopeProduct.times()).toBe(0);
    expect(scopeCategories.times()).toBe(1);
    expect(response.data.length).toBe(2);
    expect(response.data).toEqual([{ name: "cat1" }, { name: "cat2" }]);
  });
});
