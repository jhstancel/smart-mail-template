.PHONY: install run test validate train fmt lint precommit

install:
\tpip install -r requirements.txt

run:
\tuvicorn app.main:app --reload

test:
\tpytest -q

validate:
\tpython scripts/validate_repo.py

train:
\tpython -m model.train

fmt:
\tblack app model scripts tests

lint:
\tflake8 app model scripts tests

precommit:
\tpre-commit run --all-files

