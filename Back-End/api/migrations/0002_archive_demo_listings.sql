-- Remove classroom examples from the public catalog; real listings stay unchanged.
UPDATE listings SET status='archived' WHERE demo=1;
