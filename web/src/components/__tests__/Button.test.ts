import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button Component', () => {
  it('renders slot content correctly', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Jouer'
      }
    })
    expect(wrapper.text()).toContain('Jouer')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(Button)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('does not emit click event when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      }
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('does not emit click event when loading', async () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      }
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('shows loading spinner when loading is true', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      }
    })
    // Loader2 component should be present (animate-spin)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })
})
