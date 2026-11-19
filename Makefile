# re-listing toolchain — chain 724 productionization
NODE ?= node

.PHONY: verify-724 plants-724 all-724 test clean

verify-724:
	$(NODE) src/cli/verify-724.ts

plants-724:
	$(NODE) src/cli/plants-724.ts

all-724: verify-724 plants-724
	@echo "all-724: verify + plants green"

test:
	$(NODE) --test test/chains/

clean:
	rm -f artifacts/*.json owner-decisions-724.md
