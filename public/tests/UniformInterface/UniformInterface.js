describe('Uniform_Interface', function(){
	describe('uses limited http verbs', function() {
		it('should use GET|PUT|POST|HEAD|DELETE|OPTIONS')
	})
	describe('follows idempotence rules', function() {
		it('should use idempotent GET')
		it('should use idempotent PUT')
		it('should use idempotent DELETE')
		it('should use non-idempotent POST')
	})
})
